import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from 'react-router-dom';
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { format, formatDistance, formatDistanceToNow, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Legend, Tooltip } from "recharts";

export default function RDRDetails({ backendUrl }) {

  const { param } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rdr, setRdr] = useState("");
  const [alias, setAlias] = useState("");
  const [id, setId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState("");
  const [foxgloveUrl, setFoxgloveUrl] = useState("");
  const [foxgloveStatus, setFoxgloveStatus] = useState("");
  const [classifiers, setClassifiers] = useState({});
  const [logs, setLogs] = useState([]);
  const [logError, setLogError] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  //  Frontend parameters
  const [relativeTime, setRelativeTime] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [customTimezone, setCustomTimezone] = useState(false);
  const [tempTimezone, setTempTimezone] = useState("");

  //  Set parameters using URL upon initialization
  useEffect(() => {
    setRelativeTime(searchParams.get("relative_time") === "true");
    setTimezone(searchParams.get("timezone") || "UTC");
    setCustomTimezone(searchParams.get("custom_timezone") === "true");
    setTempTimezone(searchParams.get("temp_timezone") || "");
  }, []);

  //  Set URL using parameters upon any update
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("relative_time", relativeTime);
    params.set("timezone", timezone);
    params.set("custom_timezone", customTimezone);
    params.set("temp_timezone", tempTimezone);
    setSearchParams(params, { replace: true });
  }, [
    relativeTime, timezone, customTimezone, tempTimezone
  ]);

  useEffect(() => {
    setLoading(true);
    const url = new URL(`/rdrs/${param}`, backendUrl);
    fetch(url.toString())
      .then(async (res) => {
        if (!res.ok) {
          const errorJson = await res.json();
          const detail = errorJson.detail;
          let errorDetail;
          if (detail?.identifier && detail?.error) {
            errorDetail = `Invalid input "${detail.identifier}": ${detail.error}`;
          } else {
            errorDetail = JSON.stringify(detail);
          }
          throw new Error(errorDetail);
        }
        return res.json();
      })
      .then((data) => {
        setRdr(data.rdr);
        setAlias(data.alias);
        setId(data.id);
        setStartTime(data.start_time);
        setEndTime(data.end_time);
        setDuration(data.duration);
        setFoxgloveUrl(data.foxglove_url);
        setFoxgloveStatus(data.foxglove_status);
        setClassifiers(data.classifiers);
        const firstLog = data.logs?.[0];
        if (firstLog?.error) {
          setLogs([]);
          setLogError(`Error retrieving logs: ${firstLog.error}`);
        } else {
          setLogs(data.logs ?? []);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [backendUrl, param]);

  //  Classifier Data
  const validClassifiers = Object.fromEntries(
    Object.entries(classifiers).filter(
      ([, classifierResult]) => !("error" in classifierResult)
    )
  );
  const classifierData = {};
  for (const [classifierName, labels] of Object.entries(validClassifiers)) {
    for (const [labelName, timestamps] of Object.entries(labels)) {
      for (const [timestamp, value] of Object.entries(timestamps)) {
        const key = `${classifierName}:${labelName}`;
        if (!(timestamp in classifierData)) {
          classifierData[timestamp] = { time: timestamp };
        }
        classifierData[timestamp][key] = (value === true) ? 1 : 0;
      }
    }
  }
  const sortedClassifierData = Object.values(classifierData).sort(
    (a, b) => new Date(a.time) - new Date(b.time)
  );
  const allLines = new Set();
  for (const classifierName in validClassifiers) {
    for (const labelName in validClassifiers[classifierName]) {
      allLines.add(`${classifierName}:${labelName}`);
    }
  }
  const [visibleLines, setVisibleLines] = useState(new Set(allLines));
  const handleToggle = (key) => {
    setVisibleLines(prev => {
      const newSet = new Set(prev);
      newSet.has(key) ? newSet.delete(key) : newSet.add(key);
      return newSet;
    });
  };
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const [date, time] = label.split("T");
      return (
        <div style={{
          backgroundColor: "white",
          border: "1px solid #ccc",
          padding: "0.5rem",
          fontSize: "14px",
          color: "black",
        }}>
          <strong>{date}</strong>
          <br />
          &nbsp;&nbsp;{time}
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
  function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }
  const NUM_TICKS = 10;
  const tickIndices = Array.from({ length: NUM_TICKS }, (_, i) => 
    Math.floor((i * sortedClassifierData.length) / (NUM_TICKS - 1))
  );
  const ticks = Array.from(new Set(tickIndices.map(i => sortedClassifierData[i]?.time))).filter(Boolean);

  //  Logs Table
  const columns = useMemo(
    () => [
      {
        header: "Start",
        accessorKey: "start_time",
        cell: ({ row }) => {
          const timestamp = row.original.start_time;
          const datestamp = new Date(timestamp);
          if (relativeTime) {
            return formatDistanceToNow(datestamp, { addSuffix: true });
          } else {
            const utcDate = parseISO(timestamp);
            const formatted = formatInTimeZone(utcDate, timezone, "yyyy-MM-dd HH:mm:ssXXX");
            const [date, time] = formatted.split(" ");
            return (
              <>
                {date}&nbsp;&nbsp;{time}
                <br />
                ({formatDistance(datestamp, new Date(startTime))} from start)
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
                {date}&nbsp;&nbsp;{time}
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
        header: "Local Path",
        accessorKey: "local_path",
        enableSorting: false,
      },
    ], [startTime, relativeTime, timezone]
  );
  const table = useReactTable({
    data: logs,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnFilters: true,
    state: {
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,
  });

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
        Loading details for {param}...
      </div>
    )
  }

  console.log(classifiers);
  return (
    <div style={{ margin: "0 auto", padding: "1rem", textAlign: "left", fontFamily: "monospace", fontSize: "14px" }}>
      <h2>Details of {rdr}</h2>

      <section
        key={rdr}
        style={{
          width: "90vw",
          margin: "1rem",
          padding: "1rem",
          textAlign: "left",
          fontFamily: "monospace",
          fontSize: "14px",
        }
        }
      >
        <>
          <p style={{ textAlign: "left" }}>
            <strong>Alias:</strong> {alias}
          </p>
          <p style={{ textAlign: "left" }}>
            <strong>ID:</strong> {id}
          </p>
          <p style={{ textAlign: "left" }}>
            <strong>Start:</strong>{" "}
            {formatInTimeZone(parseISO(startTime), timezone, "yyyy-MM-dd HH:mm:ssXXX")}
            &nbsp;&nbsp;({formatDistanceToNow(new Date(startTime), { addSuffix: true })})
          </p>
          <p style={{ textAlign: "left" }}>
            <strong>End:</strong>{" "}
            {formatInTimeZone(parseISO(endTime), timezone, "yyyy-MM-dd HH:mm:ssXXX")}
            &nbsp;&nbsp;({formatDistanceToNow(new Date(endTime), { addSuffix: true })})
          </p>
          <p style={{ textAlign: "left" }}>
            <strong>Duration:</strong> {duration}
          </p>
          <p style={{ textAlign: "left"}}>
            {foxgloveUrl ? (
              <a href={foxgloveUrl}>
                {foxgloveStatus}
              </a>
            ) : (
              <span>{foxgloveStatus}</span>
            )}
          </p>
        </>
      </section>

      <div>
        <h4>Classifier Values</h4>
        {Array.from(allLines).map(key => (
          <label key={key} style={{ margin: "1rem", display: "inline-block" }}>
            <input
              type="checkbox"
              checked={visibleLines.has(key)}
              onChange={() => handleToggle(key)}
            />
            {key}
          </label>
        ))}
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={sortedClassifierData}>
            <XAxis
              dataKey="time"
              tickFormatter={(isoTime) => format(new Date(isoTime), "HH:mm:ss")}
              ticks={ticks}
              tick={{ fontSize: 14, textAnchor: "middle" }}
            />
            <YAxis
              domain={[-0.25, 1.25]}
              tickFormatter={(value) => (value === 1 ? "True" : "False")}
              ticks={[0, 1]}
              tick={{ fontSize: 14 }}
              scale="linear"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              height={25}
              verticalAlign="bottom"
              wrapperStyle={{ bottom: 0 }}
            />
            {Array.from(visibleLines).map(key => (
              <Line
                type="monotone"
                key={key}
                dataKey={key}
                dot={true}
                stroke={stringToColor(key)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
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

      <div>
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
      </div>

      {logError && (
        <p style={{ textAlign: "left", color: "orange" }}>
          <strong>{logError}</strong>
        </p>
      )}
      <details>
        <summary style={{ textAlign: 'left', cursor: 'pointer' }}>Click to show/hide logs</summary>
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
                    onClick={() => {
                      const isSorted = header.column.getIsSorted();
                      if (!isSorted) {
                        header.column.toggleSorting(true);
                      } else if (isSorted === "desc") {
                        header.column.toggleSorting(false);
                      } else {
                        header.column.clearSorting();
                      }
                    }}
                    style={{ cursor: "pointer", width: "400px" }}
                  >
                    <div style={{ display: "flex", alignItems: "left", gap: "0.25rem" }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted()] ?? ""}
                    </div>
                    <div style={{ marginTip: "0.25rem" }}>
                      {header.column.id === "local_path" && (
                        <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                          <input
                            type="text"
                            placeholder="Filter by local path"
                            value={table.getColumn("local_path")?.getFilterValue() ?? ""}
                            onChange={(e) => table.getColumn("local_path")?.setFilterValue(e.target.value)}
                            style={{
                              width: "100%",
                              paddingRight: "2rem",
                              boxSizing: "border-box",
                              fontFamily: "monospace",
                            }}
                          />
                          {columnFilters.some(f => f.id === "local_path" && f.value) && (
                            <button
                              onClick={() => table.getColumn("local_path")?.setFilterValue()}
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
      </details>
    </div>
  );
}
