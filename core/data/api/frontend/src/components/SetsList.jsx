import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatDistanceToNow, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export default function SetsList({ backendUrl }) {

  const [searchParams, setSearchParams] = useSearchParams();

  const [total, setTotal] = useState(0);
  const [validAuthors, setValidAuthors] = useState([]);
  const [sets, setSets] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  //  Backend parameters
  const [setFilter, setSetFilter] = useState("");
  const [tempSetFilter, setTempSetFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [tempTagFilter, setTempTagFilter] = useState("");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  //  Frontend parameters
  const [relativeTime, setRelativeTime] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [customTimezone, setCustomTimezone] = useState(false);
  const [tempTimezone, setTempTimezone] = useState("");

  //  Set parameters using URL upon initialization
  useEffect(() => {
    setSetFilter(searchParams.get("name") || "");
    setTempSetFilter(searchParams.get("temp_name") || "");
    setAuthorFilter(searchParams.get("author") || "");
    setSortKey(searchParams.get("sort_key") || "");
    setSortAsc(searchParams.get("sort_asc") === "true");
    setTagFilter(searchParams.get("tag") || "");
    setTempTagFilter(searchParams.get("temp_tag") || "");
    setLimit(parseInt(searchParams.get("limit") || "50", 10));
    setOffset(parseInt(searchParams.get("offset") || "0", 10));

    setRelativeTime(searchParams.get("relative_time") === "true");
    setTimezone(searchParams.get("timezone") || "UTC");
    setCustomTimezone(searchParams.get("custom_timezone") === "true");
    setTempTimezone(searchParams.get("temp_timezone") || "");
  }, []);

  //  Set URL using parameters upon any update
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("name", setFilter);
    params.set("temp_name", tempSetFilter);
    params.set("author", authorFilter);
    params.set("sort_key", sortKey);
    params.set("sort_asc", sortAsc);
    params.set("tag", tagFilter);
    params.set("temp_tag", tempTagFilter);
    params.set("limit", limit);
    params.set("offset", offset);

    params.set("relative_time", relativeTime);
    params.set("timezone", timezone);
    params.set("custom_timezone", customTimezone);
    params.set("temp_timezone", tempTimezone);
    setSearchParams(params, { replace: true });
  }, [
    setFilter, tempSetFilter, authorFilter, sortKey, sortAsc, tagFilter, tempTagFilter, limit, offset,
    relativeTime, timezone, customTimezone, tempTimezone
  ]);

  useEffect(() => {
    setLoading(true);
    const url = new URL("/sets", backendUrl);
    if (setFilter !== "") url.searchParams.append("name", setFilter);
    if (authorFilter !== "") url.searchParams.append("author", authorFilter);
    if (sortKey !== "") url.searchParams.append("sort_key", sortKey);
    url.searchParams.append("sort_asc", sortAsc);
    if (tagFilter !== "") url.searchParams.append("tag", tagFilter);
    if (limit !== 0) url.searchParams.append("limit", limit);
    if (offset !== 0) url.searchParams.append("offset", offset);
    fetch(url.toString())
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setTotal(data.total);
        setValidAuthors(data.valid_authors);
        setSets(data.sets);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [backendUrl, setFilter, authorFilter, sortKey, sortAsc, tagFilter, limit, offset]);

  //  RDR Set Table
  const columns = useMemo(
    () => [
      {
        header: "Set",
        accessorKey: "set",
        cell: ({ row }) => (
          <a href={`/rdrsets/${row.original.set}`}>
            {row.original.set}
          </a>
        ),
      },
      {
        header: "Description",
        accessorKey: "description",
      },
      {
        header: "Created By",
        accessorKey: "created_by",
      },
      {
        header: "Created At",
        accessorKey: "created_at",
        cell: ({ row }) => {
          const timestamp = row.original.created_at;
          if (relativeTime) {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
          } else {
            const utcDate = parseISO(timestamp);
            const formatted = formatInTimeZone(utcDate, timezone, "yyyy-MM-dd HH:mm:ssXXX");
            const [date, time] = formatted.split(" ");
            return (
              <>
                {date}
                <br />
                &nbsp;&nbsp;{time}
              </>
            )
          }
        },
      },
      {
        header: "Count",
        accessorKey: "count",
      },
      {
        header: "Duration",
        accessorKey: "duration",
      },
      {
        header: "Tags",
        accessorKey: "tags",
        cell: ({ row }) => {
          const tags = row.original.tags;
          return (
            <>
              {tags.map(tag => (
                <div key={tag}>{tag}</div>
              ))}
            </>
          );
        },
      },
    ], [relativeTime, timezone]
  );
  const table = useReactTable({
    data: sets,
    columns: columns,
    getCoreRowModel: getCoreRowModel()
  });

  //  Pagination
  const canGoPrev = offset > 0;
  const canGoNext = offset + sets.length < total;

  //  Local Time
  const localTime = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (error) {
    return (
      <div style={{ fontFamily: "monospace", fontSize: "14px", color: "red" }}>
        Error: {error}
      </div>
    )
  }
  if (loading) {
    return (
      <div style={{ fontFamily: "monospace", fontSize: "14px" }}>
        Loading sets...
      </div>
    )
  }

  return (
    <div style={{ margin: "0 auto", padding: "1rem", textAlign: "left", fontFamily: "monospace", fontSize: "14px" }}>
      <h2>RDR Sets</h2>

      <div>
        <label htmlFor="timezone-select"><strong>Select Time Zone:</strong></label>
        <select
          id="timezone-select"
          value={customTimezone ? "custom" : timezone}
          onChange={(e) => {
            const selected = e.target.value;
            if (selected === "custom") {
              setCustomTimezone(true);
            } else {
              setCustomTimezone(false);
              setTimezone(selected);
            }
          }}
          style={{ marginRight: "1rem", fontFamily: "monospace" }}
        >
          <option value="UTC">UTC</option>
          <option value="America/Los_Angeles">Los Angeles (San Francisco | Mare Island)</option>
          <option value="America/New_York">New York (New York)</option>
          <option value="America/Chicago">Chicago (Arkansas | Austin | Prototown)</option>
          <option value="America/Phoenix">Phoenix (Cave Creek)</option>
          <option value={localTime}>{localTime} (Local Time)</option>
          <option value="custom">-- Enter Custom Time Zone --</option>
        </select>

        {customTimezone && (
          <div style={{ display: "inline-block", position: "relative", width: "200px" }}>
            <input
              type="text"
              placeholder="e.g. Europe/Paris"
              value={tempTimezone}
              autoFocus
              onChange={(e) => setTempTimezone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setTimezone(tempTimezone);
                }
              }}
              style={{ fontFamily: "monospace", paddingRight: "2rem", boxSizing: "border-box" }}
            />
            {tempTimezone && (
              <button
                onClick={() => {
                  setTempTimezone("");
                  setTimezone("UTC");
                }}
                onMouseDown={(e) => e.preventDefault()}
                aria-label="Clear timezone"
                style={{
                  position: "absolute",
                  right: "0.3rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontWeight: "bold",
                  color: "#888",
                  fontSize: "14px",
                  padding: 0,
                  lineHeight: 1,
                  outline: "none",
                  fontFamily: "monospace",
                }}
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      <label htmlFor="relative-time"><strong>Show Relative Time:</strong></label>
        <input
          id="relative-time"
          type="checkbox"
          checked={relativeTime}
          onChange={() => {
            setRelativeTime(!relativeTime);
          }}
          style={{ marginRight: "0.5rem" }}
        />

      <table
        border="1"
        cellPadding="5"
        cellSpacing="0"
        style={{
          margin: "0 auto",
          borderCollapse: "collapse",
          width: "100%",
        }}
      >
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ cursor: "pointer", width: "250px" }}
                >
                  <div style={{ display: "flex", alignItems: "left", gap: "0.25rem" }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.id === "created_at" && (
                      <button
                        onClick={() => {
                          if (sortKey !== "created_at") {
                            setSortKey("created_at");
                            setSortAsc(false);
                          } else if (!sortAsc) {
                            setSortAsc(true);
                          } else {
                            setSortKey("");
                          }
                          setOffset(0);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontWeight: "bold",
                          color: "#888",
                          fontSize: "14px",
                          padding: 0,
                          lineHeight: 1,
                          outline: "none",
                        }}
                        aria-label="Sort by created_at"
                      >
                        {(sortKey !== "created_at") ? "―" : (sortAsc ? "↑" : "↓")}
                      </button>
                    )}
                    {header.column.id === "count" && (
                      <button
                        onClick={() => {
                          if (sortKey !== "rdr_count") {
                            setSortKey("rdr_count");
                            setSortAsc(false);
                          } else if (!sortAsc) {
                            setSortAsc(true);
                          } else {
                            setSortKey("");
                          }
                          setOffset(0);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontWeight: "bold",
                          color: "#888",
                          fontSize: "14px",
                          padding: 0,
                          lineHeight: 1,
                          outline: "none",
                        }}
                        aria-label="Sort by rdr_count"
                      >
                        {(sortKey !== "rdr_count") ? "―" : (sortAsc ? "↑" : "↓")}
                      </button>
                    )}
                    {header.column.id === "duration" && (
                      <button
                        onClick={() => {
                          if (sortKey !== "rdr_duration") {
                            setSortKey("rdr_duration");
                            setSortAsc(false);
                          } else if (!sortAsc) {
                            setSortAsc(true);
                          } else {
                            setSortKey("");
                          }
                          setOffset(0);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontWeight: "bold",
                          color: "#888",
                          fontSize: "14px",
                          padding: 0,
                          lineHeight: 1,
                          outline: "none",
                        }}
                        aria-label="Sort by rdr_duration"
                      >
                        {(sortKey !== "rdr_duration") ? "―" : (sortAsc ? "↑" : "↓")}
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: "0.25rem" }}>
                    {header.column.id === "set" && (
                      <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                        <input
                          type="text"
                          placeholder="Filter by name"
                          value={tempSetFilter}
                          onChange={(e) => setTempSetFilter(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setSetFilter(tempSetFilter);
                              setOffset(0);
                            }
                          }}
                          style={{
                            width: "100%",
                            paddingRight: "2rem",
                            boxSizing: "border-box",
                            fontFamily: "monospace",
                          }}
                        />
                        {tempSetFilter && (
                          <button
                            onClick={() => {
                              setTempSetFilter("");
                              setSetFilter("");
                              setOffset(0);
                            }}
                            style={{
                              position: "absolute",
                              right: "0.3rem",
                              top: "50%",
                              transform: "translateY(-50%)",
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              fontWeight: "bold",
                              color: "#888",
                              fontSize: "14px",
                              padding: 0,
                              lineHeight: 1,
                              outline: "none",
                              fontFamily: "monospace",
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            aria-label="Clear"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}
                    {header.column.id === "created_by" && (
                      <select
                        value={authorFilter}
                        onChange={(e) => {
                          setAuthorFilter(e.target.value);
                          setOffset(0);
                        }}
                        style={{
                          width: "100%",
                          fontFamily: "monospace",
                        }}
                      >
                        <option value="">All</option>
                        {validAuthors.map((author) => (
                          <option key={author} value={author}>
                            {author}
                          </option>
                        ))}
                      </select>
                    )}
                    {header.column.id === "tags" && (
                      <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                        <input
                          type="text"
                          placeholder="Filter by tag"
                          value={tempTagFilter}
                          onChange={(e) => setTempTagFilter(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setTagFilter(tempTagFilter);
                              setOffset(0);
                            }
                          }}
                          style={{
                            width: "100%",
                            paddingRight: "2rem",
                            boxSizing: "border-box",
                            fontFamily: "monospace",
                          }}
                        />
                        {tempTagFilter && (
                          <button
                            onClick={() => {
                              setTempTagFilter("");
                              setTagFilter("");
                              setOffset(0);
                            }}
                            style={{
                              position: "absolute",
                              right: "0.3rem",
                              top: "50%",
                              transform: "translateY(-50%)",
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              fontWeight: "bold",
                              color: "#888",
                              fontSize: "14px",
                              padding: 0,
                              lineHeight: 1,
                              outline: "none",
                              fontFamily: "monospace",
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            aria-label="Clear"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  style={{
                    width: "250px",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    whiteSpace: "normal",
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
        }}
      >
        <button onClick={() => setOffset((o) => Math.max(o - limit, 0))} disabled={!canGoPrev}>
          Previous
        </button>
        <span>
          Showing {offset + 1} - {offset + sets.length} of {total}
        </span>
        <button onClick={() => setOffset((o) => o + sets.length)} disabled={!canGoNext}>
          Next
        </button>
      </div>
    </div>
  );
}
