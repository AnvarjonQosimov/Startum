import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'stratum_platform_master_secret_2026_xyz987';

export function requirePlatformAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid platform authorization header'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isPlatformDeveloper) {
      return res.status(403).json({ error: 'Access denied: Requires platform developer credentials' });
    }
    req.platformUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired platform token' });
  }
}

