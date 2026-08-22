import dotenv from "dotenv";
dotenv.config({ path: process.env.NODE_ENV === "development" ? ".env.dev" : ".env" });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
