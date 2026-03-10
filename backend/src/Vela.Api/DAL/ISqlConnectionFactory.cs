using System.Data.SqlClient;

namespace Vela.Api.DAL;

public interface ISqlConnectionFactory
{
    SqlConnection CreateOpenConnection();
}
