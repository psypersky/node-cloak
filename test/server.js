import { times, uniq } from 'lodash';
import { expect } from 'chai';
import request from 'supertest';
import createServer from '../lib/server';

describe('Server', function() {
  const app = createServer();

  it('should respond with 200', async () => {
    request(app)
      .get('/')
      .expect(200);
  });

  it('should respond with 503', async () => {
    request(app)
      .get('/proxy')
      .expect(503);
  });
});
