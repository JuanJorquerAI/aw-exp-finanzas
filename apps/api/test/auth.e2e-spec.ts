import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /importers/sheet sin token retorna 401', () => {
    return request(app.getHttpServer())
      .post('/importers/sheet')
      .send({ payments: [], invoices: [], visa: [], opportunities: [] })
      .expect(401);
  });

  it('POST /companies sin token retorna 401', () => {
    return request(app.getHttpServer())
      .post('/companies')
      .send({ name: 'Test', slug: 'test' })
      .expect(401);
  });

  it('GET /health (público) responde 200 sin token', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('POST /auth/login retorna access_token con credenciales válidas', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'dev@aplicacionesweb.cl', password: 'changeme' })
      .expect(201)
      .expect((res) => {
        if (!res.body.access_token) throw new Error('missing access_token');
      });
  });

  it('POST /auth/login retorna 401 con credenciales inválidas', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'bad@example.com', password: 'wrongpass' })
      .expect(401);
  });
});
