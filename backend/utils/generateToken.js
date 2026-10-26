import jwt from 'jsonwebtoken';
export default user => jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
