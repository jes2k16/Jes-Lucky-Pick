using Hangfire.Dashboard;

namespace JesLuckyPick.Api.Middleware;

/// <summary>
/// Allows Hangfire dashboard access only to authenticated Admin users.
/// Falls back to allowing localhost in development.
/// </summary>
public class HangfireAdminAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // Allow localhost without auth in development
        if (httpContext.Request.Host.Host is "localhost" or "127.0.0.1")
            return true;

        var user = httpContext.User;
        return user.Identity?.IsAuthenticated == true &&
               user.IsInRole("Admin");
    }
}
