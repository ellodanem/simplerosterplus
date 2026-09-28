import { payrollErrorResponse } from "@/lib/payroll/access";
import { bankingDownload } from "@/lib/payroll/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await bankingDownload(id);
  } catch (err) {
    return payrollErrorResponse(err);
  }
}
