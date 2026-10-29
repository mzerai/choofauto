import type { StaffRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { staffId: string; role: StaffRole } & DefaultSession["user"];
  }
}
