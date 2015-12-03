import path from 'path';
import Koa from 'koa';
import Router from 'koa-router';
import assert from 'http-assert';
import Cluster from './cluster';

const defaultClusterPath = path.resolve(__dirname, '..', 'data');

export default function createServer(cluster) {
  cluster = cluster || new Cluster(defaultClusterPath)

  const router = Router();

  router.get('/', function(ctx) {
    ctx.status(200);
    ctx.message = 'Ok';
  });

  router.get('/proxy', async function(ctx) {
    assert(cluster.ready, 503, 'Cluster is booting up');
    ctx.status(200);
    ctx.message = Cluster.getProxy();
  });

  const app = new Koa();
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.startCluster = async () => {
    if (!cluster.starting && !cluster.ready) {
      await cluster.connect();
    }
  }

  return app;
}
