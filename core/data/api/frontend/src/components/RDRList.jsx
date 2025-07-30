import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatDistanceToNow, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ResponsiveContainer, BarChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip } from "recharts";

export default function RDRList({ backendUrl, base }) {

  const { param } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [type, setType] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [total, setTotal] = useState(0);
  const [validAliases, setValidAliases] = useState([]);
  const [validIds, setValidIds] = useState([]);
  const [dateHist, setDateHist] = useState([]);
  const [durationHist, setDurationHist] = useState([]);
  const [durationHistY, setDurationHistY] = useState("linear");
  const [durationKde, setDurationKde] = useState([]);
  const [durationKdeX, setDurationKdeX] = useState("linear");
  const [durationKdeY, setDurationKdeY] = useState("linear");
  const [machineHist, setMachineHist] = useState([]);
  const [rcmHist, setRcmHist] = useState([]);
  const [rdrs, setRdrs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  //  Backend parameters
  const [aliasFilter, setAliasFilter] = useState("");
  const [idFilter, setIdFilter] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
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
    setSortKey(searchParams.get("sort_key") || "");
    setSortAsc(searchParams.get("sort_asc") === "true");
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
    params.set("sort_key", sortKey);
    params.set("sort_asc", sortAsc);
    params.set("limit", limit);
    params.set("offset", offset);

    params.set("relative_time", relativeTime);
    params.set("timezone", timezone);
    params.set("custom_timezone", customTimezone);
    params.set("temp_timezone", tempTimezone);
    setSearchParams(params, { replace: true });
  }, [
    aliasFilter, idFilter, sortKey, sortAsc, limit, offset,
    relativeTime, timezone, customTimezone, tempTimezone
  ]);

  useEffect(() => {
    setLoading(true);
    const url = new URL(`/${base}/${param}`, backendUrl);
    if (aliasFilter !== "") url.searchParams.append("alias", aliasFilter);
    if (idFilter !== "") url.searchParams.append("robot_id", idFilter);
    if (sortKey !== "") url.searchParams.append("sort_key", sortKey);
    url.searchParams.append("sort_asc", sortAsc);
    if (limit !== 0) url.searchParams.append("limit", limit);
    if (offset !== 0) url.searchParams.append("offset", offset);
    fetch(url.toString())
      .then(async (res) => {
        if (!res.ok) {
          const errorJson = await res.json();
          const detail = errorJson.detail;
          let errorDetail;
          if (detail?.type && detail?.identifier && detail?.error) {
            errorDetail = `Invalid input ${detail.type} "${detail.identifier}": ${detail.error}`;
          } else {
            errorDetail = JSON.stringify(detail);
          }
          throw new Error(errorDetail);
        }
        return res.json();
      })
      .then((data) => {
        setType(data.type);
        setIdentifier(data.identifier);
        setTotal(data.total);
        setValidAliases(data.valid_aliases);
        setValidIds(data.valid_ids);
        setDateHist(
          fillDateHistogram(
            Object.fromEntries(
              Object.entries(data.date_histogram)
                .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            )
          )
        );
        setDurationHist(
          Object.entries(data.duration_histogram)
            .sort((a, b) => parseFloat(a[0].split("-")[0]) - parseFloat(b[0].split("-")[0]))
            .map(([range, count]) => ({range, count}))
        );
        setDurationKde(
          Object.entries(data.duration_kde)
            .sort((a, b) => a.x - b.x)
            .map(([x, density]) => ({x: parseFloat(x), density}))
        );
        setMachineHist(
          Object.entries(data.machine_histogram)
            .map(([alias, count]) => ({alias, count}))
        );
        setRcmHist(
          Object.entries(data.rcm_histogram)
            .map(([id, count]) => ({id, count}))
        );
        setRdrs(data.rdrs);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [backendUrl, base, param, aliasFilter, idFilter, sortKey, sortAsc, limit, offset]);

  //  RDRs Table
  const columns = useMemo(
    () => [
      {
        header: "RDR (Foxglove)",
        accessorKey: "rdr",
        cell: ({ row }) => {
          return row.original.foxglove_url ? (
            <a href={row.original.foxglove_url}>
              {row.original.rdr}
            </a>
          ) : (
            <span>{row.original.rdr}</span>
          );
        },
      },
      {
        header: "Alias",
        accessorKey: "alias",
      },
      {
        header: "RCM ID",
        accessorKey: "id",
      },
      {
        header: "Start",
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
                {date}
                <br />
                &nbsp;&nbsp;{time}
              </>
            )
          }
        },
      },
      {
        header: "End",
        accessorKey: "end_time",
        cell: ({ row }) => {
          const timestamp = row.original.end_time;
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
        header: "Duration",
        accessorKey: "duration",
      },
      {
        header: "Details",
        accessorKey: "details",
        cell: ({ row }) => (
          <a href={`/rdrs/${row.original.rdr}`}>
            Details
          </a>
        ),
      }
    ], [relativeTime, timezone]
  );
  const table = useReactTable({
    data: rdrs,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
  });

  //  Pagination
  const canGoPrev = offset > 0;
  const canGoNext = offset + rdrs.length < total;

  //  Local Time
  const localTime = Intl.DateTimeFormat().resolvedOptions().timeZone;

  //  Graph Tools
  function fillDateHistogram(rawHistogram) {
    const rawDates = Object.keys(rawHistogram);
    const histogram = []
    const start = new Date(rawDates[0]);
    const end = new Date(rawDates[rawDates.length - 1]);
    for (
      let d = new Date(start);
      d <= end;
      d.setDate(d.getDate() + 1)
    ) {
      const iso = d.toISOString().slice(0, 10);
      histogram.push({
        date: iso,
        count: rawHistogram[iso] || 0,
      });
    }
    return histogram;
  }
  const toggleScale = (scale, setScale) => {
    setScale(scale === "log" ? "linear" : "log");
  };
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: "white",
          border: "1px solid #ccc",
          padding: "0.5rem",
          fontSize: "14px",
          color: "black",
        }}>
          <strong>{label}</strong>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: <strong>{entry.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  const timeDensitySum = durationKde.reduce((sum, d) => sum + d.x * d.density, 0);
  const densitySum = durationKde.reduce((sum, d) => sum + d.density, 0);
  const meanTime = timeDensitySum / densitySum;
  const minTime = Math.min(...durationKde.map((d) => d.x));
  const maxTime = Math.max(...durationKde.map((d) => d.x));
  const uniformDensity = 1 / (maxTime - minTime);

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
        Loading RDRs for {param}...
      </div>
    )
  }

  return (
    <div style={{ margin: "0 auto", padding: "1rem", textAlign: "left", fontFamily: "monospace", fontSize: "14px" }} >
      <h2>Robot Data Ranges of {type} {identifier}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "auto auto auto",
          gap: "1rem",
        }}
      >
        <div style={{ gridColumn: "1 / 3" }}>
          <h4>Dates Collected</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dateHist}>
              <XAxis
                dataKey="date"
                height={70}
                interval={6}
                tick={{ fontSize: 12, angle: -45, textAnchor: "end" }}
              />
              <YAxis
                width={70}
                domain={[0, "auto"]}
                label={{ value: "Count", position: "insideLeft", angle: -90 }}
                scale="linear"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ gridColumn: "1 / 2" }}>
          <h4>RDR Durations (Histogram)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={durationHist}>
              <XAxis
                dataKey="range"
                height={70}
                interval={4}
                tickFormatter={(value) => `${parseFloat(value.split("-")[0]).toFixed(1)}-${parseFloat(value.split("-")[0]).toFixed(1)}`}
                tick={{ fontSize: 12, angle: -45, textAnchor: "end" }}
                label={{ value: "Seconds", position: "bottom", offset: -10 }}
              />
              <YAxis
                width={70}
                domain={durationHistY === "log" ? [1, "auto"] : [0, "auto"]}
                label={{ value: "Count", position: "insideLeft", angle: -90 }}
                scale={durationHistY}
                onClick={() => toggleScale(durationHistY, setDurationHistY)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ gridColumn: "2 / 3" }}>
          <h4>RDR Durations (Kernel Density Estimation)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={durationKde}>
              <XAxis
                dataKey="x"
                type="number"
                domain={durationKdeX === "log" ? [1, "auto"] : [0, "auto"]}
                interval={durationKdeX === "log" ? "preserveEnd" : 4}
                tickFormatter={(value) => value.toFixed(0)}
                tick={{ fontSize: 12 }}
                label={{ value: "Seconds", position: "bottom", offset: -10 }}
                scale={durationKdeX}
                onClick={() => toggleScale(durationKdeX, setDurationKdeX)}
              />
              <YAxis
                width={80}
                domain={durationKdeY === "log" ? [1, "auto"] : [0, "auto"]}
                tickFormatter={(value) => value.toExponential(1)}
                label={{ value: "Density", position: "insideLeft", angle: -90 }}
                scale={durationKdeY}
                onClick={() => toggleScale(durationKdeY, setDurationKdeY)}
              />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="density" stroke="#82ca9d" dot={false} />
              <ReferenceLine
                x={meanTime}
                stroke="red"
                strokeDasharray="3 3"
                label={{ value: "Mean", position: "insideTopLeft", fontSize: 12, fill: "red" }}
              />
              <ReferenceLine
                y={uniformDensity}
                stroke="red"
                strokeDasharray="3 3"
                label={{ value: "Uniform Density", position: "insideBottomRight", fontSize: 12, fill: "red" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ gridColumn: "1 / 2" }}>
          <h4>Machines Used</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={machineHist}>
              <XAxis
                dataKey="alias"
                height={70}
                interval={0}
                tick={{ fontSize: 12, angle: -45, textAnchor: "end" }}
              />
              <YAxis
                width={70}
                domain={[0, "auto"]}
                label={{ value: "Count", position: "insideLeft", angle: -90 }}
                scale="linear"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ gridColumn: "2 / 3" }}>
          <h4>RCMs Used</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rcmHist}>
              <XAxis
                dataKey="id"
                height={70}
                interval={0}
                tick={{ fontSize: 12, angle: -45, textAnchor: "end" }}
              />
              <YAxis
                width={70}
                domain={[0, "auto"]}
                label={{ value: "Count", position: "insideLeft", angle: -90 }}
                scale="linear"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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
                  fontSize: "1rem",
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
                  style={{ cursor: "pointer", width: "150px" }}
                >
                  <div style={{ display: "flex", alignItems: "left", gap: "0.25rem" }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.id === "start_time" && (
                      <button
                        onClick={() => {
                          if (sortKey !== "start_time") {
                            setSortKey("start_time");
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
                        aria-label="Sort by start_time"
                      >
                        {(sortKey !== "start_time") ? "―" : (sortAsc ? "↑" : "↓")}
                      </button>
                    )}
                    {header.column.id === "end_time" && (
                      <button
                        onClick={() => {
                          if (sortKey !== "end_time") {
                            setSortKey("end_time");
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
                        aria-label="Sort by end_time"
                      >
                        {(sortKey !== "end_time") ? "―" : (sortAsc ? "↑" : "↓")}
                      </button>
                    )}
                    {header.column.id === "duration" && (
                      <button
                        onClick={() => {
                          if (sortKey !== "duration") {
                            setSortKey("duration");
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
                        aria-label="Sort by duration"
                      >
                        {(sortKey !== "duration") ? "―" : (sortAsc ? "↑" : "↓")}
                      </button>
                    )}
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
                    width: "150px",
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
          Showing {offset + 1} - {offset + rdrs.length} of {total}
        </span>
        <button onClick={() => setOffset((o) => o + rdrs.length)} disabled={!canGoNext}>
          Next
        </button>
      </div>
    </div>
  );
}
