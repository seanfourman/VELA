using System.Data;
using System.Data.SqlClient;

namespace Vela.Api.DAL;

public static class SqlStoredProcedureCommandBuilder
{
    public static SqlCommand Create(
        string storedProcedureName,
        SqlConnection connection,
        Dictionary<string, object> parameters
    )
    {
        var command = new SqlCommand(storedProcedureName, connection)
        {
            CommandType = CommandType.StoredProcedure,
        };

        foreach (var parameter in parameters)
        {
            command.Parameters.AddWithValue(parameter.Key, parameter.Value ?? DBNull.Value);
        }

        return command;
    }
}
