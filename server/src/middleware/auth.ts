import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type UserRole = 'STORE_OPERATOR' | 'OPTOMETRIST' | 'ADMIN';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  storeId?: string;
  storeName?: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'visionbridge_super_secure_jwt_secret_change_in_production';

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  let token: string | undefined;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (authHeader) {
    token = authHeader;
  }

  // Fallback to query parameter (e.g. for media streaming: ?token=...)
  if (!token && req.query?.token) {
    token = String(req.query.token);
  }

  // Fallback to cookie
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)vb_auth_token=([^;]*)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. No bearer token provided.' },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err: unknown) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Session expired or token is invalid. Please sign in again.' },
    });
  }
};

/**
 * Strict authentication middleware for private clinical media streaming (photos & ocular images).
 * Enforces token verification via Bearer header, URL query token, or secure session cookie.
 * Rejects unauthenticated requests with HTTP 401 Unauthorized.
 */
export const authenticateMedia = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  let token: string | undefined;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (authHeader) {
    token = authHeader;
  }

  // Fallback to query parameter (e.g. for media streaming: ?token=...)
  if (!token && req.query?.token) {
    token = String(req.query.token);
  }

  // Fallback to cookie (e.g. browser <img> tags in authenticated sessions)
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)vb_auth_token=([^;]*)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_MEDIA_ACCESS',
        message: 'Authentication required to view or stream clinical photographs.',
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err: unknown) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Session expired or token is invalid. Please sign in again.',
      },
    });
  }
};

/**
 * Optional authentication middleware for public media streaming (such as <img> tags).
 * If a valid token is provided via header, query, or cookie, populates req.user.
 * If absent, proceeds without failing.
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  let token: string | undefined;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (authHeader) {
    token = authHeader;
  }

  if (!token && req.query?.token) {
    token = String(req.query.token);
  }

  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)vb_auth_token=([^;]*)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
    } catch {
      // Quietly ignore invalid token for optional auth
    }
  }

  next();
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Your role (${req.user.role}) does not have permission for this resource.`,
        },
      });
      return;
    }

    next();
  };
};

/**
 * Middleware ensuring store operators only access data scoped to their assigned store.
 */
export const requireStoreOwnership = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  // Admins and Optometrists have system/review level permissions
  if (req.user.role === 'ADMIN' || req.user.role === 'OPTOMETRIST') {
    return next();
  }

  // Store operator must have a storeId assigned
  if (!req.user.storeId) {
    res.status(403).json({
      success: false,
      error: { code: 'STORE_UNASSIGNED', message: 'Operator account is not assigned to any optical store.' },
    });
    return;
  }

  next();
};
