import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const MOCK_USERS = [
  { id: '1', email: 'dev@aplicacionesweb.cl', password: 'changeme' },
];

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = MOCK_USERS.find(
      (u) => u.email === email && u.password === password,
    );
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { access_token: token };
  }
}
