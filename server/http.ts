import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ApiFailure, ApiSuccess } from '../shared/types.js'

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message)
  }
}

export function sendSuccess<T>(response: Response, data: T, isDemo?: boolean, status = 200) {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), ...(isDemo === undefined ? {} : { isDemo }) },
  }
  response.status(status).json(body)
}

export const asyncHandler = (handler: (request: Request, response: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (request, response, next) => void handler(request, response, next).catch(next)

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  const apiError = error instanceof ApiError
    ? error
    : new ApiError(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : '服务器发生未知错误。')
  const body: ApiFailure = {
    success: false,
    error: { code: apiError.code, message: apiError.message },
    meta: { timestamp: new Date().toISOString() },
  }
  response.status(apiError.status).json(body)
}
