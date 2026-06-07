import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extracts the most meaningful error message from any API error response.
 * Handles all shapes returned by the .NET backend:
 *   { message: "..." }
 *   { success: false, message: "..." }
 *   { errors: { field: ["msg"] } }   ← ModelState / ValidationProblemDetails
 *   { title: "...", detail: "..." }  ← ProblemDetails
 *   Plain string body
 */
export function extractApiError(error: any, fallback = 'An unexpected error occurred.'): string {
  if (!error) return fallback;

  // HttpErrorResponse wrapper
  const body = error instanceof HttpErrorResponse ? error.error : error;

  if (typeof body === 'string' && body.trim()) return body.trim();

  if (body && typeof body === 'object') {
    // { message: "..." } or { success: false, message: "..." }
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }

    // ASP.NET ProblemDetails: { title, detail }
    if (typeof body.detail === 'string' && body.detail.trim()) {
      return body.detail.trim();
    }
    if (typeof body.title === 'string' && body.title.trim()) {
      return body.title.trim();
    }

    // ASP.NET ModelState: { errors: { field: ["msg1", "msg2"] } }
    if (body.errors && typeof body.errors === 'object') {
      const msgs: string[] = [];
      for (const key of Object.keys(body.errors)) {
        const val = body.errors[key];
        if (Array.isArray(val)) msgs.push(...val);
        else if (typeof val === 'string') msgs.push(val);
      }
      if (msgs.length) return msgs.join(' | ');
    }
  }

  // HttpErrorResponse statusText fallback
  if (error instanceof HttpErrorResponse && error.status) {
    return `Server error ${error.status}: ${error.statusText || fallback}`;
  }

  return fallback;
}
