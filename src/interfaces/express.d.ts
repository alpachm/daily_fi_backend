export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        pk_user: number;
        email: string;
      };
    }
  }
}
