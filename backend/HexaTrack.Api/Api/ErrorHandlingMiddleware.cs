using System.Net;
using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Application.Security;

namespace HexaTrack.Api.Api;

public sealed class ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            if (exception is not TooManyRequestsException)
            {
                logger.LogError(exception, "Unhandled API error");
            }

            if (context.Response.HasStarted)
            {
                logger.LogWarning("Response already started; cannot write error payload for: {Message}", exception.Message);
                return;
            }

            HttpStatusCode status = exception switch
            {
                UnauthorizedAccessException => HttpStatusCode.Unauthorized,
                TooManyRequestsException => (HttpStatusCode)429,
                KeyNotFoundException => HttpStatusCode.NotFound,
                InvalidOperationException => HttpStatusCode.BadRequest,
                DbUpdateConcurrencyException => HttpStatusCode.Conflict,
                DbUpdateException => HttpStatusCode.Conflict,
                _ => HttpStatusCode.InternalServerError
            };

            context.Response.StatusCode = (int)status;
            await context.Response.WriteAsJsonAsync(new { error = exception.Message });
        }
    }
}

