import Link from "next/link";
import { notFound } from "next/navigation";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { gatePayrollPage } from "@/lib/payroll/access";
import { bankingList, creditUnionLetters, glStatement, payslipLines } from "@/lib/payroll/documents";
import { formatMoney } from "@/lib/payroll/format";
import { FREQUENCY_LABEL, payDateMonthKey } from "@/lib/payroll/frequency";
import { getPayRun } from "@/lib/payroll/runs";
import { CreditUnionEditor } from "./credit-union-editor";

const DOCS = ["summary", "payslips", "nic", "gl", "banking", "credit-union"] as const;
type Doc = (typeof DOCS)[number];

export default async function PrintPage({
  params,
}: {
  params: Promise<{ id: string; doc: string }>;
}) {
  const gate = await gatePayrollPage();
  if (gate.kind === "signin") redirectToSignIn();
  if (gate.kind === "hidden") notFound();
  if (gate.kind === "unsupported") return <p>{gate.message}</p>;

  const { id, doc } = await params;
  if (!DOCS.includes(doc as Doc)) notFound();
  let run;
  try {
    run = await getPayRun(gate.access, id);
  } catch {
    return notFound();
  }
  if (run.status === "draft" && doc !== "summary") notFound();

  const config = gate.access.config;
  const legalName = config.legalName || gate.orgName;
  const centre = config.glCentre || run.locationName;
  const department = config.glDepartment || "";
  const recordOnly = run.status === "void";
  const month = payDateMonthKey(run.payDate)?.slice(5);
  const monthName = month
    ? new Date(Date.UTC(2000, Number(month) - 1, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" }).toUpperCase()
    : "";

  return (
    <div className="print-sheet">
      <style>{`
        @media print {
          header, footer, nav { display: none !important; }
          .no-print { display: none !important; }
          .print-sheet { padding: 0; }
          .slip { break-after: page; }
        }
      `}</style>
      <div className="no-print mb-4 flex gap-3 text-sm">
        <Link href={`/payroll/runs/${run.id}`} className="font-medium text-emerald-800">
          ← Back to the pay run
        </Link>
      </div>
      <p className="no-print mb-4 text-sm text-zinc-600">Use your browser’s print command to print or save a PDF.</p>
      {recordOnly ? (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          This report is a record only and is not filed.
        </p>
      ) : null}

      {doc === "summary" ? <Summary run={run} legalName={legalName} /> : null}
      {doc === "payslips" ? (
        <Payslips run={run} legalName={legalName} address={config.addressLine ?? ""} phone={config.phone ?? ""} />
      ) : null}
      {doc === "nic" ? <Nic run={run} monthName={monthName} /> : null}
      {doc === "gl" ? <Gl run={run} centre={centre} department={department} /> : null}
      {doc === "banking" ? <Banking run={run} country={gate.access.country} /> : null}
      {doc === "credit-union" ? (
        <CreditUnionEditor
          legalName={legalName}
          period={`${run.rangeStart} – ${run.rangeEnd}`}
          letters={creditUnionLetters(run, gate.access.country)}
        />
      ) : null}
    </div>
  );
}

function Summary({
  run,
  legalName,
}: {
  run: Awaited<ReturnType<typeof getPayRun>>;
  legalName: string;
}) {
  const hourly = run.lines.filter((line) => line.payType === "hourly");
  const salaried = run.lines.filter((line) => line.payType === "salaried");
  return (
    <article>
      <h1 className="text-xl font-semibold">{legalName}</h1>
      <p className="text-sm">
        Payroll summary · {run.rangeStart} – {run.rangeEnd} · cycle {run.cycleNumber}
      </p>
      <Group title="Hourly" lines={hourly} />
      <Group title="Salaried" lines={salaried} />
      <p className="mt-4 text-sm font-medium">
        Totals · gross {formatMoney(run.totals.gross)} · deductions {formatMoney(run.totals.deductions)} · net{" "}
        {formatMoney(run.totals.net)}
      </p>
      <p className="mt-2 text-sm text-zinc-600">PAYE is still handled outside this app. Amounts shown were typed on the pay run.</p>
    </article>
  );
}

function Group({ title, lines }: { title: string; lines: Awaited<ReturnType<typeof getPayRun>>["lines"] }) {
  return (
    <section className="mt-4">
      <h2 className="font-semibold">{title}</h2>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Name</th>
            <th className="text-right">Hours</th>
            <th className="text-right">Gross</th>
            <th className="text-right">Deductions</th>
            <th className="text-right">Net</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id}>
              <td>{line.displayName}</td>
              <td className="text-right">{line.sourceHours.toFixed(2)}</td>
              <td className="text-right">{formatMoney(line.gross)}</td>
              <td className="text-right">{formatMoney(line.totalDeductions)}</td>
              <td className="text-right">{formatMoney(line.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Payslips({
  run,
  legalName,
  address,
  phone,
}: {
  run: Awaited<ReturnType<typeof getPayRun>>;
  legalName: string;
  address: string;
  phone: string;
}) {
  const lines = payslipLines(run);
  if (lines.length === 0) return <p>No one has earnings or deductions on this run.</p>;
  return (
    <div>
      {lines.map((line) => (
        <article key={line.id} className="slip mb-8 border border-zinc-300 p-4">
          <h1 className="text-lg font-semibold">{legalName}</h1>
          <p className="text-sm">{[address, phone].filter(Boolean).join(" · ")}</p>
          <p className="mt-2 font-medium">{line.displayName}</p>
          <p className="text-sm">
            {run.rangeStart} – {run.rangeEnd} · pay date {run.payDate} · {FREQUENCY_LABEL[line.payFrequency]}
          </p>
          <p className="text-sm">NIC {line.nicNumber || "—"} · tax code {line.taxCode || "—"} · {line.bankName || "No bank"} {line.bankAccount}</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              <tr>
                <td>Basic</td>
                <td className="text-right">{line.basicHours.toFixed(2)} h</td>
                <td className="text-right">{formatMoney(line.basicPay)}</td>
              </tr>
              <tr>
                <td>Overtime</td>
                <td className="text-right">{line.overtimeHours.toFixed(2)} h</td>
                <td className="text-right">{formatMoney(line.overtimePay)}</td>
              </tr>
              <tr>
                <td>Extra</td>
                <td />
                <td className="text-right">{formatMoney(line.extraEarnings)}</td>
              </tr>
              <tr>
                <td>N.I.C.</td>
                <td />
                <td className="text-right">{formatMoney(line.employeeNic)}</td>
              </tr>
              <tr>
                <td>P.A.Y.E.</td>
                <td />
                <td className="text-right">{formatMoney(line.paye)}</td>
              </tr>
              <tr>
                <td>Medical</td>
                <td />
                <td className="text-right">{formatMoney(line.medical)}</td>
              </tr>
              <tr>
                <td>Staff loan</td>
                <td />
                <td className="text-right">{formatMoney(line.loanDeduction)}</td>
              </tr>
              <tr>
                <td>Shortage</td>
                <td />
                <td className="text-right">{formatMoney(line.shortage)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm">
            Gross {formatMoney(line.gross)} · deductions {formatMoney(line.totalDeductions)} · net {formatMoney(line.net)}
          </p>
          <p className="text-sm">
            Year to date gross {formatMoney(line.ytdGross + (run.status === "void" ? 0 : line.gross))} · net{" "}
            {formatMoney(line.ytdNet + (run.status === "void" ? 0 : line.net))}
          </p>
        </article>
      ))}
    </div>
  );
}

function Nic({ run, monthName }: { run: Awaited<ReturnType<typeof getPayRun>>; monthName: string }) {
  const lines = run.lines.filter((line) => line.gross !== 0 || line.employeeNic !== 0 || line.employerNic !== 0);
  const staff = lines.reduce((sum, line) => sum + line.employeeNic, 0);
  const employer = lines.reduce((sum, line) => sum + line.employerNic, 0);
  return (
    <article>
      <h1 className="text-xl font-semibold">N.I.C.</h1>
      <p className="text-sm">
        {run.rangeStart} – {run.rangeEnd} · cycle {run.cycleNumber} · FOR: {monthName}
      </p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Name</th>
            <th className="text-right">Charge</th>
            <th className="text-right">Staff</th>
            <th className="text-right">Employer</th>
            <th className="text-right">Govt ttl</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id}>
              <td>{line.nicNumber ? `${line.nicNumber} - ${line.displayName}` : line.displayName}</td>
              <td className="text-right">{formatMoney(line.employeeNic)}</td>
              <td className="text-right">{formatMoney(line.employeeNic)}</td>
              <td className="text-right">{formatMoney(line.employerNic)}</td>
              <td className="text-right">{formatMoney(line.employeeNic + line.employerNic)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td>Total</td>
            <td className="text-right">{formatMoney(staff)}</td>
            <td className="text-right">{formatMoney(staff)}</td>
            <td className="text-right">{formatMoney(employer)}</td>
            <td className="text-right">{formatMoney(staff + employer)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-sm">Printed {new Date().toISOString().slice(0, 10)}</p>
    </article>
  );
}

function Gl({
  run,
  centre,
  department,
}: {
  run: Awaited<ReturnType<typeof getPayRun>>;
  centre: string;
  department: string;
}) {
  const statement = glStatement(run);
  return (
    <article>
      <h1 className="text-xl font-semibold">{centre}</h1>
      <p className="text-sm">Department {department || "—"} · {run.rangeStart} – {run.rangeEnd}</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <MoneyTable title="Earnings" rows={statement.earnings} />
        <MoneyTable title="Deductions" rows={statement.deductions} />
      </div>
      <p className="mt-4 text-sm">Employer N.I.C. memo {formatMoney(statement.employerNic)}</p>
      <h2 className="mt-8 text-lg font-semibold">Grand totals</h2>
      <p className="text-sm">
        Earnings {formatMoney(statement.earnings.reduce((sum, row) => sum + row.amount, 0))} · deductions{" "}
        {formatMoney(statement.deductions.reduce((sum, row) => sum + row.amount, 0))}
      </p>
    </article>
  );
}

function MoneyTable({ title, rows }: { title: string; rows: { label: string; amount: number }[] }) {
  return (
    <section>
      <h2 className="font-semibold">{title}</h2>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td className="text-right">{formatMoney(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Banking({
  run,
  country,
}: {
  run: Awaited<ReturnType<typeof getPayRun>>;
  country: Parameters<typeof bankingList>[1];
}) {
  const list = bankingList(run, country);
  const other = run.thirdParty.reduce((sum, item) => sum + item.amount, 0);
  return (
    <article>
      <h1 className="text-xl font-semibold">Banking list</h1>
      <p className="text-sm">{run.rangeStart} – {run.rangeEnd}</p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Code</th>
            <th>Name</th>
            <th>Account</th>
            <th className="text-right">Net</th>
          </tr>
        </thead>
        <tbody>
          {list.rows.map((row) => (
            <tr key={`${row.code}-${row.name}`}>
              <td>{row.code}</td>
              <td>{row.name}</td>
              <td>{row.account}</td>
              <td className="text-right">{formatMoney(row.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="mt-4 font-semibold">Buckets</h2>
      <ul className="text-sm">
        {list.buckets.map((bucket) => (
          <li key={bucket.bucket}>
            {bucket.bucket}: {formatMoney(bucket.total)}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm font-medium">List total {formatMoney(list.total)}</p>
      {other ? (
        <p className="text-sm">
          Other payments {formatMoney(other)} · combined {formatMoney(list.total + other)}
        </p>
      ) : null}
    </article>
  );
}
