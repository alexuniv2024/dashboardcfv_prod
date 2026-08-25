import sql from "mssql";

function getProfitConfig(): sql.config {
  const authType = process.env.PROFIT_DB_AUTH_TYPE ?? "sql";

  const baseConfig: sql.config = {
    server: process.env.PROFIT_DB_HOST ?? "localhost",
    database: process.env.PROFIT_DB_DATABASE ?? "cfvtest",
    connectionTimeout: 20000,
    requestTimeout: 20000,
    options: {
      encrypt: process.env.PROFIT_DB_ENCRYPT === "true",
      trustServerCertificate:
        process.env.PROFIT_DB_TRUST_SERVER_CERTIFICATE === "true",
    },
  };

  if (process.env.PROFIT_DB_PORT) {
    baseConfig.port = Number(process.env.PROFIT_DB_PORT);
  }

  if (process.env.PROFIT_DB_INSTANCE) {
    baseConfig.options = {
      ...baseConfig.options,
      instanceName: process.env.PROFIT_DB_INSTANCE,
    };
  }

  if (authType === "sql") {
    baseConfig.user = process.env.PROFIT_DB_USER;
    baseConfig.password = process.env.PROFIT_DB_PASSWORD;
  }

  if (authType === "ntlm") {
    // Solo para pruebas locales con Windows Authentication.
    // No es la opción recomendada para producción/Vercel.
    (baseConfig as any).authentication = {
      type: "ntlm",
      options: {
        domain: process.env.PROFIT_DB_DOMAIN ?? "",
        userName: process.env.PROFIT_DB_USER ?? "",
        password: process.env.PROFIT_DB_PASSWORD ?? "",
      },
    };
  }

  return baseConfig;
}

export async function withProfitPool<T>(
  fn: (request: sql.Request) => Promise<T>
): Promise<T> {
  const config = getProfitConfig();
  const pool = new sql.ConnectionPool(config);

  await pool.connect();

  try {
    return await fn(pool.request());
  } finally {
    await pool.close();
  }
}