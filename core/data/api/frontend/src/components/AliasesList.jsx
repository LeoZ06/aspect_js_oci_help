import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatDistanceToNow, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export default function AliasesList({ backendUrl }) {

  const [searchParams, setSearchParams] = useSearchParams();

  const [total, setTotal] = useState(0);
  const [validAliases, setValidAliases] = useState([]);
  const [validIds, setValidIds] = useState([]);
  const [aliases, setAliases] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  //  Backend parameters
  const [aliasFilter, setAliasFilter] = useState("");
  const [idFilter, setIdFilter] = useState("");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  //  Frontend parameters
  const [relativeTime, setRelativeTime] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [customTimezone, setCustomTimezone] = useState(false);
  const [tempTimezone, setTempTimezone] = useState("");

  //  Set parameters using URL upon initialization
  useEffect(() => {
    setAliasFilter(searchParams.get("alias") || "");
    setIdFilter(searchParams.get("robot_id") || "");
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
    params.set("alias", aliasFilter);
    params.set("robot_id", idFilter);
    params.set("limit", limit);
    params.set("offset", offset);

    params.set("relative_time", relativeTime);
    params.set("timezone", timezone);
    params.set("custom_timezone", customTimezone);
    params.set("temp_timezone", tempTimezone);
    setSearchParams(params, { replace: true });
  }, [
    aliasFilter, idFilter, limit, offset,
    relativeTime, timezone, customTimezone, tempTimezone
  ]);

  useEffect(() => {
    setLoading(true);
    const url = new URL("/aliases", backendUrl);
    if (aliasFilter !== "") url.searchParams.append("alias", aliasFilter);
    if (idFilter !== "") url.searchParams.append("robot_id", idFilter);
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
        setValidAliases(data.valid_aliases);
        setValidIds(data.valid_ids);
        setAliases(data.aliases);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [backendUrl, aliasFilter, idFilter, limit, offset]);

  //  Alias Table
  const columns = useMemo(
    () => [
      {
        header: "Alias",
        accessorKey: "alias",
        cell: ({ row }) => (
          <a href={`/machines/${row.original.alias}`}>
            {row.original.alias}
          </a>
        ),
      },
      {
        header: "RCM ID",
        accessorKey: "id",
        cell: ({ row }) => (
          <a href={`/rcms/${row.original.id}`}>
            {row.original.id}
          </a>
        ),
      },
      {
        header: "Start Time",
        accessorKey: "start_time",
        cell: ({ row }) => {
          const timestamp = row.original.start_time;
          if (relativeTime) {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
          } else {
            const utcDate = parseISO(timestamp);
            const formatted = formatInTimeZone(utcDate, timezone, "yyyy-MM-dd HH:mm:ssXXX");
            const [date, time] = formatted.split(" ");
            return (
              <>
                {date}&nbsp;&nbsp;{time}
              </>
            )
          }
        },
      },
      {
        header: "End Time",
        accessorKey: "end_time",
        cell: ({ row }) => {
          if (!row.original.end_time) return "";
          const timestamp = row.original.end_time;
          if (relativeTime) {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
          } else {
            const utcDate = parseISO(timestamp);
            const formatted = formatInTimeZone(utcDate, timezone, "yyyy-MM-dd HH:mm:ssXXX");
            const [date, time] = formatted.split(" ");
            return (
              <>
                {date}&nbsp;&nbsp;{time}
              </>
            )
          }
        },
      },
    ], [relativeTime, timezone]
  );
  const table = useReactTable({
    data: aliases,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
  });

  //  Pagination
  const canGoPrev = offset > 0;
  const canGoNext = offset + aliases.length < total;

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
        Loading aliases...
      </div>
    )
  }

  return (
    <div style={{ margin: "0 auto", padding: "1rem", textAlign: "left", fontFamily: "monospace", fontSize: "14px" }}>
      <h2>Aliases</h2>

      <div>
        <label htmlFor="timezone-select"><strong>Select Time Zone:</strong></label>
        <select
          id="timezone-select"
          value={customTimezone ? "custom": timezone}
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
                  style={{ cursor: "pointer", width: "300px" }}
                >
                  <div style={{ display: "flex", alignItems: "left", gap: "0.25rem" }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                  <div style={{ marginTop: "0.25rem" }}>
                    {header.column.id === "alias" && (
                      <select
                        value={aliasFilter}
                        onChange={(e) => {
                          setAliasFilter(e.target.value);
                          setOffset(0);
                        }}
                        style={{
                          width: "100%",
                          fontFamily: "monospace",
                        }}
                      >
                        <option value="">All</option>
                        {validAliases.map((alias) => (
                          <option key={alias} value={alias}>
                            {alias}
                          </option>
                        ))}
                      </select>
                    )}
                    {header.column.id === "id" && (
                      <select
                        value={idFilter}
                        onChange={(e) => {
                          setIdFilter(e.target.value);
                          setOffset(0);
                        }}
                        style={{
                          width: "100%",
                          fontFamily: "monospace",
                        }}
                      >
                        <option value="">All</option>
                        {validIds.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
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
                    width: "300px",
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
          Showing {offset + 1} - {offset + aliases.length} of {total}
        </span>
        <button onClick={() => setOffset((o) => o + aliases.length)} disabled={!canGoNext}>
          Next
        </button>
      </div>
    </div>
  );
}
