using System.Data;
using System.Data.SqlClient;

namespace Vela.Api.DAL;

public abstract class DBService
{
    protected SqlConnection Connect()
    {
        var configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json").Build();
        string cStr = configuration.GetConnectionString("myProjDB");
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
