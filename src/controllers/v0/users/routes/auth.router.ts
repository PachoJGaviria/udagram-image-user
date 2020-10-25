import {Router, Request, Response} from 'express';

import {User} from '../models/User';

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import {NextFunction} from 'connect';

import * as EmailValidator from 'email-validator';
import {config} from '../../../../config/config';

// eslint-disable-next-line new-cap
const router: Router = Router();

/**
 * Generate a secure hash from a password
 * @param {string} plainTextPassword
 * @return {Promise<string>} salt hash
 */
async function generatePassword(plainTextPassword: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(plainTextPassword, saltRounds);
}

/**
 * Check that the password matches with the salt hash
 * @param {string} password
 * @param  {string} hash
 * @return {Promise<boolean>}
 */
async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT
 * @param {User} user
 * @return {Promise<string>}
 */
async function generateJWT(user: User): Promise<string> {
  return new Promise((resolve: (value?: string) => void, reject: (reason?: any) => void) => {
    jwt.sign(user.short(), config.jwt.secret, (err: any, token: string) => {
      if (err) {
        reject(err);
      }
      resolve(token);
    });
  });
}

/**
 * Verify JWT
 * @param {string} token
 * @return {Promise<object>}
 */
async function verifyJWT(token: string): Promise<object> {
  return new Promise((resolve: (value?: object) => void, reject: (reason?: any) => void) => {
    jwt.verify(token, config.jwt.secret, (err: jwt.VerifyErrors | null, decoded: object | undefined) => {
      if (err) {
        reject(err);
      }
      resolve(decoded);
    });
  });
}

/**
 * Middleware that check if request has valid authorization
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.headers || !req.headers.authorization) {
    return res.status(401).send({message: 'No authorization headers.'});
  }

  const tokenBearer = req.headers.authorization.split(' ');
  if (tokenBearer.length != 2) {
    return res.status(401).send({message: 'Malformed token.'});
  }

  const token = tokenBearer[1];
  try {
    const decoded = await verifyJWT(token);
    console.log(decoded);
    return next();
  } catch (err) {
    return res.status(500)
        .send({auth: false, message: 'Failed to authenticate.', details: err?.message});
  }
}

router.get('/verification',
    requireAuth,
    async (req: Request, res: Response) => {
      return res.status(200).send({auth: true, message: 'Authenticated.'});
    });

router.post('/login', async (req: Request, res: Response) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !EmailValidator.validate(email)) {
    return res.status(400)
        .send({auth: false, message: 'Email is required or malformed'});
  }

  if (!password) {
    return res.status(400)
        .send({auth: false, message: 'Password is required'});
  }

  const user = await User.findByPk(email);
  if (!user) {
    return res.status(401)
        .send({auth: false, message: 'Unauthorized'});
  }

  const authValid = await comparePasswords(password, user.passwordHash);
  if (!authValid) {
    return res.status(401)
        .send({auth: false, message: 'Unauthorized'});
  }

  const token = await generateJWT(user);
  res.status(200)
      .send({auth: true, token, user: user.short()});
});

router.post('/', async (req: Request, res: Response) => {
  const email = req.body.email;
  const plainTextPassword = req.body.password;

  if (!email || !EmailValidator.validate(email)) {
    return res.status(400)
        .send({auth: false, message: 'Email is required or malformed'});
  }

  if (!plainTextPassword) {
    return res.status(400)
        .send({auth: false, message: 'Password is required'});
  }

  const user = await User.findByPk(email);
  if (user) {
    return res.status(422)
        .send({auth: false, message: 'User may already exist'});
  }

  const generatedHash = await generatePassword(plainTextPassword);
  const newUser = new User({
    email: email,
    passwordHash: generatedHash,
  });
  let savedUser;
  try {
    savedUser = await newUser.save();
  } catch (err) {
    return res.status(500)
        .send({message: 'Failed to save user.', details: err?.message});
  }

  const token = await generateJWT(savedUser);
  res.status(201).send({token, user: savedUser.short()});
});

router.get('/', async (req: Request, res: Response) => {
  res.send('auth');
});

export const AuthRouter: Router = router;
