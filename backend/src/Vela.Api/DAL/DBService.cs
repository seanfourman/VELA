using System.Data;
using System.Data.SqlClient;

namespace Vela.Api.DAL;

public abstract class DBService
{
    protected SqlConnection Connect()
    {
        var configuration = new ConfigurationBuilder().AddJsonFile("appsettings.json").Build();
        var connectionString =
            configuration.GetConnectionString("myProjDB")
            ?? configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Missing connection string. Configure ConnectionStrings:myProjDB (or DefaultConnection) in appsettings.json."
            );
        }

        var con = new SqlConnection(connectionString);
        con.Open();
        return con;
    }

    protected SqlCommand CreateCommand(
        string spName,
        SqlConnection con,
        Dictionary<string, object>? parameters
    )
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

    protected SqlCommand CreateTextCommand(
        string sql,
        SqlConnection con,
        Dictionary<string, object>? parameters
    )
    {
        var cmd = new SqlCommand(sql, con);
        cmd.CommandType = CommandType.Text;

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
