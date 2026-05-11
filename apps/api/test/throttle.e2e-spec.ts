import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('Throttler (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const jwt = app.get(JwtService);
    token = await jwt.signAsync({ sub: '1', email: 'dev@aplicacionesweb.cl' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /importers/sheet retorna 429 después de 10 requests/minuto', async () => {
    const empty = { payments: [], invoices: [], visa: [], opportunities: [] };
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/importers/sheet')
        .set('Authorization', `Bearer ${token}`)
        .send(empty);
    }
    const res = await request(app.getHttpServer())
      .post('/importers/sheet')
      .set('Authorization', `Bearer ${token}`)
      .send(empty);
    expect(res.status).toBe(429);
  }, 30_000);
});
