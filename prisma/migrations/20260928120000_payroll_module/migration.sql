-- Payroll module. Off until an operator enables PayrollConfig for the organization.

CREATE TYPE "PayFrequency" AS ENUM ('weekly', 'biweekly', 'semimonthly', 'monthly');
CREATE TYPE "PayType" AS ENUM ('hourly', 'salaried');
CREATE TYPE "OvertimeRule" AS ENUM ('none', 'daily', 'weekly');
CREATE TYPE "PayRunStatus" AS ENUM ('draft', 'processed', 'void');
CREATE TYPE "StaffLoanStatus" AS ENUM ('active', 'paid');
CREATE TYPE "LoanTermUnit" AS ENUM ('months', 'pays');

CREATE TABLE "PayrollConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "countryCode" TEXT NOT NULL DEFAULT 'LC',
    "overtimeRule" "OvertimeRule" NOT NULL DEFAULT 'none',
    "overtimeMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.50,
    "legalName" TEXT,
    "addressLine" TEXT,
    "phone" TEXT,
    "glCentre" TEXT,
    "glDepartment" TEXT,
    "columnLayout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayrollConfig_organizationId_key" ON "PayrollConfig"("organizationId");

CREATE TABLE "StaffPayProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "nicNumber" TEXT,
    "payFrequency" "PayFrequency" NOT NULL DEFAULT 'semimonthly',
    "payType" "PayType" NOT NULL DEFAULT 'hourly',
    "hourlyRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salaryAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxCode" TEXT,
    "medicalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "openLoanAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffPayProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffPayProfile_staffId_key" ON "StaffPayProfile"("staffId");
CREATE INDEX "StaffPayProfile_organizationId_idx" ON "StaffPayProfile"("organizationId");

CREATE TABLE "StaffLoan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "principal" DECIMAL(12,2) NOT NULL,
    "termCount" INTEGER NOT NULL,
    "termUnit" "LoanTermUnit" NOT NULL,
    "startDate" DATE NOT NULL,
    "status" "StaffLoanStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffLoan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffLoan_organizationId_idx" ON "StaffLoan"("organizationId");
CREATE INDEX "StaffLoan_staffId_status_idx" ON "StaffLoan"("staffId", "status");

CREATE TABLE "PayRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "payPeriodId" TEXT NOT NULL,
    "status" "PayRunStatus" NOT NULL DEFAULT 'draft',
    "openSlot" TEXT,
    "countryCode" TEXT NOT NULL,
    "frequency" "PayFrequency" NOT NULL,
    "rangeStart" DATE NOT NULL,
    "rangeEnd" DATE NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "cycleManual" BOOLEAN NOT NULL DEFAULT false,
    "payDate" DATE NOT NULL,
    "overtimeRule" "OvertimeRule" NOT NULL,
    "overtimeMultiplier" DECIMAL(4,2) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedByUserId" TEXT,
    "voidedByName" TEXT,
    "voidReason" TEXT,
    "thirdParty" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayRun_payPeriodId_openSlot_key" ON "PayRun"("payPeriodId", "openSlot");
CREATE INDEX "PayRun_organizationId_payDate_idx" ON "PayRun"("organizationId", "payDate");
CREATE INDEX "PayRun_locationId_idx" ON "PayRun"("locationId");

CREATE TABLE "PayRunLine" (
    "id" TEXT NOT NULL,
    "payRunId" TEXT NOT NULL,
    "staffId" TEXT,
    "sortName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "nicNumber" TEXT,
    "payType" "PayType" NOT NULL,
    "payFrequency" "PayFrequency" NOT NULL,
    "reportOnly" BOOLEAN NOT NULL DEFAULT false,
    "sourceHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "basicHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "dayBuckets" JSONB NOT NULL,
    "hourlyRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salaryAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "extraEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customColumns" JSONB NOT NULL,
    "vacationNote" TEXT NOT NULL DEFAULT '',
    "sickDays" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "employeeNic" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employerNic" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loanDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "medical" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shortage" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paye" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gross" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxCode" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayRunLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PayRunLine_payRunId_idx" ON "PayRunLine"("payRunId");
CREATE INDEX "PayRunLine_staffId_idx" ON "PayRunLine"("staffId");

ALTER TABLE "PayrollConfig" ADD CONSTRAINT "PayrollConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffPayProfile" ADD CONSTRAINT "StaffPayProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffPayProfile" ADD CONSTRAINT "StaffPayProfile_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffLoan" ADD CONSTRAINT "StaffLoan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffLoan" ADD CONSTRAINT "StaffLoan_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayRun" ADD CONSTRAINT "PayRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayRun" ADD CONSTRAINT "PayRun_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayRun" ADD CONSTRAINT "PayRun_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayRun" ADD CONSTRAINT "PayRun_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayRun" ADD CONSTRAINT "PayRun_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayRunLine" ADD CONSTRAINT "PayRunLine_payRunId_fkey" FOREIGN KEY ("payRunId") REFERENCES "PayRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayRunLine" ADD CONSTRAINT "PayRunLine_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
