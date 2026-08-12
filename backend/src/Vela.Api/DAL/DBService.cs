using System.Data;
using System.Data.SqlClient;

namespace Vela.Api.DAL;

public abstract class DBService
{
    // The BL layer news up DAL services directly, so configuration cannot arrive through DI.
    // Build it once instead of re-reading and re-parsing appsettings.json on every query.
    private static readonly Lazy<IConfiguration> SharedConfiguration = new(BuildConfiguration);

    private static IConfiguration BuildConfiguration()
    {
        // Base the lookup on the build output directory rather than the current working directory,
        // so the DAL keeps working regardless of where the process was launched from.
        var environment =
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";

        return new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
    }

    protected SqlConnection Connect()
    {
        var cStr = SharedConfiguration.Value.GetConnectionString("myProjDB");
        if (string.IsNullOrWhiteSpace(cStr))
        {
            throw new InvalidOperationException(
                "Connection string 'myProjDB' is missing. Copy appsettings.example.json to "
                    + "appsettings.json and set ConnectionStrings:myProjDB."
            );
        }

        var con = new SqlConnection(cStr);
        con.Open();
        return con;
    }

    protected SqlCommand CreateCommand(string spName, SqlConnection con, Dictionary<string, object> parameters)
    {
        var cmd = new SqlCommand(spName, con);
        cmd.CommandType = CommandType.StoredProcedure;
        if (parameters != null)
        {
            foreach (var param in parameters)
            {
                cmd.Parameters.AddWithValue(param.Key, param.Value ?? DBNull.Value);
            }
        }
        return cmd;
    }
}
