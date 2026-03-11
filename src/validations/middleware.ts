/**
 * Validation middleware using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

/**
 * Validation error response format
 */
interface ValidationError {
  field: string;
  message: string;
}

/**
 * Creates validation middleware for request body
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = (error as any).issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          validationErrors
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid request data'
        });
      }
    }
  };
}

/**
 * Creates validation middleware for request query parameters
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      (req as any).query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = (error as any).issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        res.status(400).json({
          success: false,
          error: 'Query validation failed',
          validationErrors
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters'
        });
      }
    }
  };
}

/**
 * Creates validation middleware for request parameters (route params)
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      (req as any).params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = (error as any).issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        res.status(400).json({
          success: false,
          error: 'Parameter validation failed',
          validationErrors
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid route parameters'
        });
      }
    }
  };
}

/**
 * Creates validation middleware for both body and params
 */
export function validateBodyAndParams<TBody extends ZodSchema, TParams extends ZodSchema>(
  bodySchema: TBody,
  paramsSchema: TParams
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate params first
      (req as any).params = paramsSchema.parse(req.params);
      // Then validate body
      (req as any).body = bodySchema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = (error as any).issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          validationErrors
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid request data'
        });
      }
    }
  };
}
