"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QTracer = exports.StatsTiming = exports.StatsGauge = exports.StatsCounter = exports.QStats = void 0;

var _config = require("./config");

var _noop = require("opentracing/lib/noop");

var _nodeStatsd = _interopRequireDefault(require("node-statsd"));

var _opentracing = require("opentracing");

var _jaegerClient = require("jaeger-client");

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function dummy(stat, value, sampleRate, tags) {}

const dummyStats = {
  configuredTags: [],
  increment: dummy,
  decrement: dummy,
  histogram: dummy,
  gauge: dummy,
  set: dummy,
  timing: dummy
};

class QStats {
  static create(server, configuredTags) {
    if (!server) {
      return dummyStats;
    }

    const hostPort = server.split(':');
    const stats = new _nodeStatsd.default(hostPort[0], hostPort[1], _config.STATS.prefix);
    stats['configuredTags'] = configuredTags;
    return stats;
  }

  static combineTags(stats, tags) {
    return stats && stats.configuredTags && stats.configuredTags.length > 0 ? stats.configuredTags.concat(tags) : tags;
  }

}

exports.QStats = QStats;

class StatsCounter {
  constructor(stats, name, tags) {
    this.stats = stats;
    this.name = name;
    this.tags = QStats.combineTags(stats, tags);
  }

  increment() {
    this.stats.increment(this.name, 1, this.tags);
  }

}

exports.StatsCounter = StatsCounter;

class StatsGauge {
  constructor(stats, name, tags) {
    this.stats = stats;
    this.name = name;
    this.tags = QStats.combineTags(stats, tags);
    this.value = 0;
  }

  set(value) {
    this.value = value;
    this.stats.gauge(this.name, this.value, this.tags);
  }

  increment(delta = 1) {
    this.set(this.value + delta);
  }

  decrement(delta = 1) {
    this.set(this.value - delta);
  }

}

exports.StatsGauge = StatsGauge;

class StatsTiming {
  constructor(stats, name, tags) {
    this.stats = stats;
    this.name = name;
    this.tags = QStats.combineTags(stats, tags);
  }

  report(value) {
    this.stats.timing(this.name, value, this.tags);
  }

  start() {
    const start = Date.now();
    return () => {
      this.report(Date.now() - start);
    };
  }

}

exports.StatsTiming = StatsTiming;

function parseUrl(url) {
  const protocolSeparatorPos = url.indexOf('://');
  const protocolEnd = protocolSeparatorPos >= 0 ? protocolSeparatorPos + 3 : 0;
  const questionPos = url.indexOf('?', protocolEnd);
  const queryStart = questionPos >= 0 ? questionPos + 1 : url.length;
  const pathEnd = questionPos >= 0 ? questionPos : url.length;
  const pathSeparatorPos = url.indexOf('/', protocolEnd); // eslint-disable-next-line no-nested-ternary

  const pathStart = pathSeparatorPos >= 0 ? pathSeparatorPos < pathEnd ? pathSeparatorPos : pathEnd : questionPos >= 0 ? questionPos : url.length;
  const hostPort = url.substring(protocolEnd, pathStart).split(':');
  return {
    protocol: url.substring(0, protocolEnd),
    host: hostPort[0],
    port: hostPort[1] || '',
    path: url.substring(pathStart, pathEnd),
    query: url.substring(queryStart)
  };
}

class QTracer {
  static getJaegerConfig(config) {
    const endpoint = config.endpoint;

    if (!endpoint) {
      return null;
    }

    const parts = parseUrl(endpoint);
    return parts.protocol === '' ? {
      serviceName: config.service,
      sampler: {
        type: 'const',
        param: 1
      },
      reporter: {
        logSpans: true,
        agentHost: parts.host,
        agentPort: Number(parts.port)
      }
    } : {
      serviceName: config.service,
      sampler: {
        type: 'const',
        param: 1
      },
      reporter: {
        logSpans: true,
        collectorEndpoint: endpoint
      }
    };
  }

  static create(config) {
    QTracer.config = config;
    const jaegerConfig = QTracer.getJaegerConfig(config.jaeger);

    if (!jaegerConfig) {
      return _noop.tracer;
    }

    return (0, _jaegerClient.initTracerFromEnv)(jaegerConfig, {
      logger: {
        info(msg) {
          console.log('INFO ', msg);
        },

        error(msg) {
          console.log('ERROR', msg);
        }

      }
    });
  }

  static messageRootSpanContext(messageId) {
    if (!messageId) {
      return null;
    }

    const traceId = messageId.substr(0, 16);
    const spanId = messageId.substr(16, 16);
    return _jaegerClient.SpanContext.fromString(`${traceId}:${spanId}:0:1`);
  }

  static extractParentSpan(tracer, req) {
    let ctx_src, ctx_frm;

    if (req.headers) {
      ctx_src = req.headers;
      ctx_frm = _opentracing.FORMAT_TEXT_MAP;
    } else {
      ctx_src = req.context;
      ctx_frm = _opentracing.FORMAT_BINARY;
    }

    return tracer.extract(ctx_frm, ctx_src);
  }

  static getParentSpan(tracer, context) {
    return context.tracerParentSpan;
  }

  static failed(tracer, span, error) {
    span.log({
      event: 'failed',
      payload: (0, _utils.toLog)(error)
    });
  }

  static async trace(tracer, name, f, parentSpan) {
    const span = tracer.startSpan(name, {
      childOf: parentSpan
    });

    try {
      span.setTag(_opentracing.Tags.SPAN_KIND, 'server');
      Object.entries(QTracer.config.jaeger.tags).forEach(([name, value]) => {
        if (name) {
          span.setTag(name, value);
        }
      });
      const result = await f(span);

      if (result !== undefined) {
        span.setTag('result', (0, _utils.toLog)(result));
      }

      span.finish();
      return result;
    } catch (error) {
      const cleaned = (0, _utils.cleanError)(error);
      QTracer.failed(tracer, span, cleaned);
      span.finish();
      throw cleaned;
    }
  }

}

exports.QTracer = QTracer;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NlcnZlci90cmFjZXIuanMiXSwibmFtZXMiOlsiZHVtbXkiLCJzdGF0IiwidmFsdWUiLCJzYW1wbGVSYXRlIiwidGFncyIsImR1bW15U3RhdHMiLCJjb25maWd1cmVkVGFncyIsImluY3JlbWVudCIsImRlY3JlbWVudCIsImhpc3RvZ3JhbSIsImdhdWdlIiwic2V0IiwidGltaW5nIiwiUVN0YXRzIiwiY3JlYXRlIiwic2VydmVyIiwiaG9zdFBvcnQiLCJzcGxpdCIsInN0YXRzIiwiU3RhdHNEIiwiU1RBVFMiLCJwcmVmaXgiLCJjb21iaW5lVGFncyIsImxlbmd0aCIsImNvbmNhdCIsIlN0YXRzQ291bnRlciIsImNvbnN0cnVjdG9yIiwibmFtZSIsIlN0YXRzR2F1Z2UiLCJkZWx0YSIsIlN0YXRzVGltaW5nIiwicmVwb3J0Iiwic3RhcnQiLCJEYXRlIiwibm93IiwicGFyc2VVcmwiLCJ1cmwiLCJwcm90b2NvbFNlcGFyYXRvclBvcyIsImluZGV4T2YiLCJwcm90b2NvbEVuZCIsInF1ZXN0aW9uUG9zIiwicXVlcnlTdGFydCIsInBhdGhFbmQiLCJwYXRoU2VwYXJhdG9yUG9zIiwicGF0aFN0YXJ0Iiwic3Vic3RyaW5nIiwicHJvdG9jb2wiLCJob3N0IiwicG9ydCIsInBhdGgiLCJxdWVyeSIsIlFUcmFjZXIiLCJnZXRKYWVnZXJDb25maWciLCJjb25maWciLCJlbmRwb2ludCIsInBhcnRzIiwic2VydmljZU5hbWUiLCJzZXJ2aWNlIiwic2FtcGxlciIsInR5cGUiLCJwYXJhbSIsInJlcG9ydGVyIiwibG9nU3BhbnMiLCJhZ2VudEhvc3QiLCJhZ2VudFBvcnQiLCJOdW1iZXIiLCJjb2xsZWN0b3JFbmRwb2ludCIsImphZWdlckNvbmZpZyIsImphZWdlciIsIm5vb3BUcmFjZXIiLCJsb2dnZXIiLCJpbmZvIiwibXNnIiwiY29uc29sZSIsImxvZyIsImVycm9yIiwibWVzc2FnZVJvb3RTcGFuQ29udGV4dCIsIm1lc3NhZ2VJZCIsInRyYWNlSWQiLCJzdWJzdHIiLCJzcGFuSWQiLCJKYWVnZXJTcGFuQ29udGV4dCIsImZyb21TdHJpbmciLCJleHRyYWN0UGFyZW50U3BhbiIsInRyYWNlciIsInJlcSIsImN0eF9zcmMiLCJjdHhfZnJtIiwiaGVhZGVycyIsIkZPUk1BVF9URVhUX01BUCIsImNvbnRleHQiLCJGT1JNQVRfQklOQVJZIiwiZXh0cmFjdCIsImdldFBhcmVudFNwYW4iLCJ0cmFjZXJQYXJlbnRTcGFuIiwiZmFpbGVkIiwic3BhbiIsImV2ZW50IiwicGF5bG9hZCIsInRyYWNlIiwiZiIsInBhcmVudFNwYW4iLCJzdGFydFNwYW4iLCJjaGlsZE9mIiwic2V0VGFnIiwiVGFncyIsIlNQQU5fS0lORCIsIk9iamVjdCIsImVudHJpZXMiLCJmb3JFYWNoIiwicmVzdWx0IiwidW5kZWZpbmVkIiwiZmluaXNoIiwiY2xlYW5lZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUVBOztBQUVBOztBQUNBOztBQUNBOztBQUVBOztBQUlBOzs7O0FBa0JBLFNBQVNBLEtBQVQsQ0FBZUMsSUFBZixFQUE2QkMsS0FBN0IsRUFBNkNDLFVBQTdDLEVBQTZFQyxJQUE3RSxFQUE4RixDQUM3Rjs7QUFFRCxNQUFNQyxVQUFrQixHQUFHO0FBQ3ZCQyxFQUFBQSxjQUFjLEVBQUUsRUFETztBQUV2QkMsRUFBQUEsU0FBUyxFQUFFUCxLQUZZO0FBR3ZCUSxFQUFBQSxTQUFTLEVBQUVSLEtBSFk7QUFJdkJTLEVBQUFBLFNBQVMsRUFBRVQsS0FKWTtBQUt2QlUsRUFBQUEsS0FBSyxFQUFFVixLQUxnQjtBQU12QlcsRUFBQUEsR0FBRyxFQUFFWCxLQU5rQjtBQU92QlksRUFBQUEsTUFBTSxFQUFFWjtBQVBlLENBQTNCOztBQVVPLE1BQU1hLE1BQU4sQ0FBYTtBQUNoQixTQUFPQyxNQUFQLENBQWNDLE1BQWQsRUFBOEJULGNBQTlCLEVBQWdFO0FBQzVELFFBQUksQ0FBQ1MsTUFBTCxFQUFhO0FBQ1QsYUFBT1YsVUFBUDtBQUNIOztBQUNELFVBQU1XLFFBQVEsR0FBR0QsTUFBTSxDQUFD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LEtBQWxCO0FBQ0g7QUFDSixPQUpEO0FBS0EsWUFBTTRHLE1BQU0sR0FBRyxNQUFNVixDQUFDLENBQUNKLElBQUQsQ0FBdEI7O0FBQ0EsVUFBSWMsTUFBTSxLQUFLQyxTQUFmLEVBQTBCO0FBQ3RCZixRQUFBQSxJQUFJLENBQUNRLE1BQUwsQ0FBWSxRQUFaLEVBQXNCLGtCQUFNTSxNQUFOLENBQXRCO0FBQ0g7O0FBQ0RkLE1BQUFBLElBQUksQ0FBQ2dCLE1BQUw7QUFDQSxhQUFPRixNQUFQO0FBQ0gsS0FiRCxDQWFFLE9BQU9uQyxLQUFQLEVBQWM7QUFDWixZQUFNc0MsT0FBTyxHQUFHLHVCQUFXdEMsS0FBWCxDQUFoQjtBQUNBeEIsTUFBQUEsT0FBTyxDQUFDNEMsTUFBUixDQUFlWCxNQUFmLEVBQXVCWSxJQUF2QixFQUE2QmlCLE9BQTdCO0FBQ0FqQixNQUFBQSxJQUFJLENBQUNnQixNQUFMO0FBQ0EsWUFBTUMsT0FBTjtBQUNIO0FBQ0o7O0FBckhnQiIsInNvdXJjZXNDb250ZW50IjpbIi8vIEBmbG93XG5cbmltcG9ydCB7IFNUQVRTIH0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHR5cGUgeyBRQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnXCI7XG5pbXBvcnQgeyB0cmFjZXIgYXMgbm9vcFRyYWNlciB9IGZyb20gXCJvcGVudHJhY2luZy9saWIvbm9vcFwiO1xuaW1wb3J0IFN0YXRzRCBmcm9tICdub2RlLXN0YXRzZCc7XG5pbXBvcnQgeyBUcmFjZXIsIFRhZ3MsIEZPUk1BVF9URVhUX01BUCwgRk9STUFUX0JJTkFSWSwgU3BhbiwgU3BhbkNvbnRleHQgfSBmcm9tIFwib3BlbnRyYWNpbmdcIjtcblxuaW1wb3J0IHtcbiAgICBpbml0VHJhY2VyRnJvbUVudiBhcyBpbml0SmFlZ2VyVHJhY2VyLFxuICAgIFNwYW5Db250ZXh0IGFzIEphZWdlclNwYW5Db250ZXh0LFxufSBmcm9tICdqYWVnZXItY2xpZW50JztcbmltcG9ydCB7IGNsZWFuRXJyb3IsIHRvTG9nIH0gZnJvbSBcIi4vdXRpbHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBJU3RhdHMge1xuICAgIGNvbmZpZ3VyZWRUYWdzOiBzdHJpbmdbXSxcblxuICAgIGluY3JlbWVudChzdGF0OiBzdHJpbmcsIHZhbHVlPzogbnVtYmVyLCBzYW1wbGVSYXRlPzogbnVtYmVyIHwgc3RyaW5nW10sIHRhZ3M/OiBzdHJpbmdbXSk6IHZvaWQsXG5cbiAgICBkZWNyZW1lbnQoc3RhdDogc3RyaW5nLCB2YWx1ZT86IG51bWJlciwgc2FtcGxlUmF0ZT86IG51bWJlciB8IHN0cmluZ1tdLCB0YWdzPzogc3RyaW5nW10pOiB2b2lkLFxuXG4gICAgaGlzdG9ncmFtKHN0YXQ6IHN0cmluZywgdmFsdWU6IG51bWJlciwgc2FtcGxlUmF0ZT86IG51bWJlciB8IHN0cmluZ1tdLCB0YWdzPzogc3RyaW5nW10pOiB2b2lkLFxuXG4gICAgZ2F1Z2Uoc3RhdDogc3RyaW5nLCB2YWx1ZTogbnVtYmVyLCBzYW1wbGVSYXRlPzogbnVtYmVyIHwgc3RyaW5nW10sIHRhZ3M/OiBzdHJpbmdbXSk6IHZvaWQsXG5cbiAgICBzZXQoc3RhdDogc3RyaW5nLCB2YWx1ZTogbnVtYmVyLCBzYW1wbGVSYXRlPzogbnVtYmVyIHwgc3RyaW5nW10sIHRhZ3M/OiBzdHJpbmdbXSk6IHZvaWQsXG5cbiAgICB0aW1pbmcoc3RhdDogc3RyaW5nLCB2YWx1ZTogbnVtYmVyLCBzYW1wbGVSYXRlPzogbnVtYmVyIHwgc3RyaW5nW10sIHRhZ3M/OiBzdHJpbmdbXSk6IHZvaWQsXG59XG5cbmZ1bmN0aW9uIGR1bW15KHN0YXQ6IHN0cmluZywgdmFsdWU/OiBudW1iZXIsIHNhbXBsZVJhdGU/OiBudW1iZXIgfCBzdHJpbmdbXSwgdGFncz86IHN0cmluZ1tdKSB7XG59XG5cbmNvbnN0IGR1bW15U3RhdHM6IElTdGF0cyA9IHtcbiAgICBjb25maWd1cmVkVGFnczogW10sXG4gICAgaW5jcmVtZW50OiBkdW1teSxcbiAgICBkZWNyZW1lbnQ6IGR1bW15LFxuICAgIGhpc3RvZ3JhbTogZHVtbXksXG4gICAgZ2F1Z2U6IGR1bW15LFxuICAgIHNldDogZHVtbXksXG4gICAgdGltaW5nOiBkdW1teSxcbn07XG5cbmV4cG9ydCBjbGFzcyBRU3RhdHMge1xuICAgIHN0YXRpYyBjcmVhdGUoc2VydmVyOiBzdHJpbmcsIGNvbmZpZ3VyZWRUYWdzOiBzdHJpbmdbXSk6IElTdGF0cyB7XG4gICAgICAgIGlmICghc2VydmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZHVtbXlTdGF0cztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBob3N0UG9ydCA9IHNlcnZlci5zcGxpdCgnOicpO1xuICAgICAgICBjb25zdCBzdGF0cyA9IG5ldyBTdGF0c0QoaG9zdFBvcnRbMF0sIGhvc3RQb3J0WzFdLCBTVEFUUy5wcmVmaXgpO1xuICAgICAgICBzdGF0c1snY29uZmlndXJlZFRhZ3MnXSA9IGNvbmZpZ3VyZWRUYWdzO1xuICAgICAgICByZXR1cm4gc3RhdHM7XG4gICAgfVxuXG4gICAgc3RhdGljIGNvbWJpbmVUYWdzKHN0YXRzOiBJU3RhdHMsIHRhZ3M6IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gKHN0YXRzICYmIHN0YXRzLmNvbmZpZ3VyZWRUYWdzICYmIHN0YXRzLmNvbmZpZ3VyZWRUYWdzLmxlbmd0aCA+IDApXG4gICAgICAgICAgICA/IHN0YXRzLmNvbmZpZ3VyZWRUYWdzLmNvbmNhdCh0YWdzKVxuICAgICAgICAgICAgOiB0YWdzO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFN0YXRzQ291bnRlciB7XG4gICAgc3RhdHM6IElTdGF0cztcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgdGFnczogc3RyaW5nW107XG5cbiAgICBjb25zdHJ1Y3RvcihzdGF0czogSVN0YXRzLCBuYW1lOiBzdHJpbmcsIHRhZ3M6IHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuc3RhdHMgPSBzdGF0cztcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy50YWdzID0gUVN0YXRzLmNvbWJpbmVUYWdzKHN0YXRzLCB0YWdzKTtcbiAgICB9XG5cbiAgICBpbmNyZW1lbnQoKSB7XG4gICAgICAgIHRoaXMuc3RhdHMuaW5jcmVtZW50KHRoaXMubmFtZSwgMSwgdGhpcy50YWdzKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTdGF0c0dhdWdlIHtcbiAgICBzdGF0czogSVN0YXRzO1xuICAgIG5hbWU6IHN0cmluZztcbiAgICB0YWdzOiBzdHJpbmdbXTtcbiAgICB2YWx1ZTogbnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3Ioc3RhdHM6IElTdGF0cywgbmFtZTogc3RyaW5nLCB0YWdzOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLnN0YXRzID0gc3RhdHM7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMudGFncyA9IFFTdGF0cy5jb21iaW5lVGFncyhzdGF0cywgdGFncyk7XG4gICAgICAgIHRoaXMudmFsdWUgPSAwO1xuICAgIH1cblxuICAgIHNldCh2YWx1ZTogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5zdGF0cy5nYXVnZSh0aGlzLm5hbWUsIHRoaXMudmFsdWUsIHRoaXMudGFncyk7XG4gICAgfVxuXG4gICAgaW5jcmVtZW50KGRlbHRhOiBudW1iZXIgPSAxKSB7XG4gICAgICAgIHRoaXMuc2V0KHRoaXMudmFsdWUgKyBkZWx0YSk7XG4gICAgfVxuXG4gICAgZGVjcmVtZW50KGRlbHRhOiBudW1iZXIgPSAxKSB7XG4gICAgICAgIHRoaXMuc2V0KHRoaXMudmFsdWUgLSBkZWx0YSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgU3RhdHNUaW1pbmcge1xuICAgIHN0YXRzOiBJU3RhdHM7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIHRhZ3M6IHN0cmluZ1tdO1xuXG4gICAgY29uc3RydWN0b3Ioc3RhdHM6IElTdGF0cywgbmFtZTogc3RyaW5nLCB0YWdzOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLnN0YXRzID0gc3RhdHM7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMudGFncyA9IFFTdGF0cy5jb21iaW5lVGFncyhzdGF0cywgdGFncyk7XG4gICAgfVxuXG4gICAgcmVwb3J0KHZhbHVlOiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5zdGF0cy50aW1pbmcodGhpcy5uYW1lLCB2YWx1ZSwgdGhpcy50YWdzKTtcbiAgICB9XG5cbiAgICBzdGFydCgpOiAoKSA9PiB2b2lkIHtcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXBvcnQoRGF0ZS5ub3coKSAtIHN0YXJ0KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcGFyc2VVcmwodXJsOiBzdHJpbmcpOiB7XG4gICAgcHJvdG9jb2w6IHN0cmluZyxcbiAgICBob3N0OiBzdHJpbmcsXG4gICAgcG9ydDogc3RyaW5nLFxuICAgIHBhdGg6IHN0cmluZyxcbiAgICBxdWVyeTogc3RyaW5nLFxufSB7XG4gICAgY29uc3QgcHJvdG9jb2xTZXBhcmF0b3JQb3MgPSB1cmwuaW5kZXhPZignOi8vJyk7XG4gICAgY29uc3QgcHJvdG9jb2xFbmQgPSBwcm90b2NvbFNlcGFyYXRvclBvcyA+PSAwID8gcHJvdG9jb2xTZXBhcmF0b3JQb3MgKyAzIDogMDtcbiAgICBjb25zdCBxdWVzdGlvblBvcyA9IHVybC5pbmRleE9mKCc/JywgcHJvdG9jb2xFbmQpO1xuICAgIGNvbnN0IHF1ZXJ5U3RhcnQgPSBxdWVzdGlvblBvcyA+PSAwID8gcXVlc3Rpb25Qb3MgKyAxIDogdXJsLmxlbmd0aDtcbiAgICBjb25zdCBwYXRoRW5kID0gcXVlc3Rpb25Qb3MgPj0gMCA/IHF1ZXN0aW9uUG9zIDogdXJsLmxlbmd0aDtcbiAgICBjb25zdCBwYXRoU2VwYXJhdG9yUG9zID0gdXJsLmluZGV4T2YoJy8nLCBwcm90b2NvbEVuZCk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5lc3RlZC10ZXJuYXJ5XG4gICAgY29uc3QgcGF0aFN0YXJ0ID0gcGF0aFNlcGFyYXRvclBvcyA+PSAwXG4gICAgICAgID8gKHBhdGhTZXBhcmF0b3JQb3MgPCBwYXRoRW5kID8gcGF0aFNlcGFyYXRvclBvcyA6IHBhdGhFbmQpXG4gICAgICAgIDogKHF1ZXN0aW9uUG9zID49IDAgPyBxdWVzdGlvblBvcyA6IHVybC5sZW5ndGgpO1xuICAgIGNvbnN0IGhvc3RQb3J0ID0gdXJsLnN1YnN0cmluZyhwcm90b2NvbEVuZCwgcGF0aFN0YXJ0KS5zcGxpdCgnOicpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHByb3RvY29sOiB1cmwuc3Vic3RyaW5nKDAsIHByb3RvY29sRW5kKSxcbiAgICAgICAgaG9zdDogaG9zdFBvcnRbMF0sXG4gICAgICAgIHBvcnQ6IGhvc3RQb3J0WzFdIHx8ICcnLFxuICAgICAgICBwYXRoOiB1cmwuc3Vic3RyaW5nKHBhdGhTdGFydCwgcGF0aEVuZCksXG4gICAgICAgIHF1ZXJ5OiB1cmwuc3Vic3RyaW5nKHF1ZXJ5U3RhcnQpLFxuICAgIH07XG59XG5cbnR5cGUgSmFlZ2VyQ29uZmlnID0ge1xuICAgIHNlcnZpY2VOYW1lOiBzdHJpbmcsXG4gICAgZGlzYWJsZT86IGJvb2xlYW4sXG4gICAgc2FtcGxlcjoge1xuICAgICAgICB0eXBlOiBzdHJpbmcsXG4gICAgICAgIHBhcmFtOiBudW1iZXIsXG4gICAgICAgIGhvc3RQb3J0Pzogc3RyaW5nLFxuICAgICAgICBob3N0Pzogc3RyaW5nLFxuICAgICAgICBwb3J0PzogbnVtYmVyLFxuICAgICAgICByZWZyZXNoSW50ZXJ2YWxNcz86IG51bWJlcixcbiAgICB9LFxuICAgIHJlcG9ydGVyOiB7XG4gICAgICAgIGxvZ1NwYW5zOiBib29sZWFuLFxuICAgICAgICBhZ2VudEhvc3Q/OiBzdHJpbmcsXG4gICAgICAgIGFnZW50UG9ydD86IG51bWJlcixcbiAgICAgICAgYWdlbnRTb2NrZXRUeXBlPzogc3RyaW5nLFxuICAgICAgICBjb2xsZWN0b3JFbmRwb2ludD86IHN0cmluZyxcbiAgICAgICAgdXNlcm5hbWU/OiBzdHJpbmcsXG4gICAgICAgIHBhc3N3b3JkPzogc3RyaW5nLFxuICAgICAgICBmbHVzaEludGVydmFsTXM/OiBudW1iZXIsXG4gICAgfSxcbiAgICB0aHJvdHRsZXI/OiB7XG4gICAgICAgIGhvc3Q6IHN0cmluZyxcbiAgICAgICAgcG9ydDogbnVtYmVyLFxuICAgICAgICByZWZyZXNoSW50ZXJ2YWxNczogbnVtYmVyLFxuICAgIH0sXG59XG5cbmV4cG9ydCBjbGFzcyBRVHJhY2VyIHtcbiAgICBzdGF0aWMgY29uZmlnOiBRQ29uZmlnO1xuXG4gICAgc3RhdGljIGdldEphZWdlckNvbmZpZyhjb25maWc6IHtcbiAgICAgICAgZW5kcG9pbnQ6IHN0cmluZyxcbiAgICAgICAgc2VydmljZTogc3RyaW5nLFxuICAgICAgICB0YWdzOiB7IFtzdHJpbmddOiBzdHJpbmcgfVxuICAgIH0pOiA/SmFlZ2VyQ29uZmlnIHtcbiAgICAgICAgY29uc3QgZW5kcG9pbnQgPSBjb25maWcuZW5kcG9pbnQ7XG4gICAgICAgIGlmICghZW5kcG9pbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhcnRzID0gcGFyc2VVcmwoZW5kcG9pbnQpO1xuICAgICAgICByZXR1cm4gKHBhcnRzLnByb3RvY29sID09PSAnJylcbiAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgIHNlcnZpY2VOYW1lOiBjb25maWcuc2VydmljZSxcbiAgICAgICAgICAgICAgICBzYW1wbGVyOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjb25zdCcsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtOiAxLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVwb3J0ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgbG9nU3BhbnM6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGFnZW50SG9zdDogcGFydHMuaG9zdCxcbiAgICAgICAgICAgICAgICAgICAgYWdlbnRQb3J0OiBOdW1iZXIocGFydHMucG9ydClcbiAgICAgICAgICAgICAgICAgICAgLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA6IHtcbiAgICAgICAgICAgICAgICBzZXJ2aWNlTmFtZTogY29uZmlnLnNlcnZpY2UsXG4gICAgICAgICAgICAgICAgc2FtcGxlcjoge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY29uc3QnLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbTogMSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcG9ydGVyOiB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ1NwYW5zOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0b3JFbmRwb2ludDogZW5kcG9pbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH07XG4gICAgfVxuXG4gICAgc3RhdGljIGNyZWF0ZShjb25maWc6IFFDb25maWcpOiBUcmFjZXIge1xuICAgICAgICBRVHJhY2VyLmNvbmZpZyA9IGNvbmZpZztcbiAgICAgICAgY29uc3QgamFlZ2VyQ29uZmlnID0gUVRyYWNlci5nZXRKYWVnZXJDb25maWcoY29uZmlnLmphZWdlcik7XG4gICAgICAgIGlmICghamFlZ2VyQ29uZmlnKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9vcFRyYWNlcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5pdEphZWdlclRyYWNlcihqYWVnZXJDb25maWcsIHtcbiAgICAgICAgICAgIGxvZ2dlcjoge1xuICAgICAgICAgICAgICAgIGluZm8obXNnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdJTkZPICcsIG1zZyk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlcnJvcihtc2cpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0VSUk9SJywgbXNnKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIG1lc3NhZ2VSb290U3BhbkNvbnRleHQobWVzc2FnZUlkOiBzdHJpbmcpOiA/U3BhbkNvbnRleHQge1xuICAgICAgICBpZiAoIW1lc3NhZ2VJZCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdHJhY2VJZCA9IG1lc3NhZ2VJZC5zdWJzdHIoMCwgMTYpO1xuICAgICAgICBjb25zdCBzcGFuSWQgPSBtZXNzYWdlSWQuc3Vic3RyKDE2LCAxNik7XG4gICAgICAgIHJldHVybiBKYWVnZXJTcGFuQ29udGV4dC5mcm9tU3RyaW5nKGAke3RyYWNlSWR9OiR7c3BhbklkfTowOjFgKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgZXh0cmFjdFBhcmVudFNwYW4odHJhY2VyOiBUcmFjZXIsIHJlcTogYW55KTogYW55IHtcbiAgICAgICAgbGV0IGN0eF9zcmMsXG4gICAgICAgICAgICBjdHhfZnJtO1xuICAgICAgICBpZiAocmVxLmhlYWRlcnMpIHtcbiAgICAgICAgICAgIGN0eF9zcmMgPSByZXEuaGVhZGVycztcbiAgICAgICAgICAgIGN0eF9mcm0gPSBGT1JNQVRfVEVYVF9NQVA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdHhfc3JjID0gcmVxLmNvbnRleHQ7XG4gICAgICAgICAgICBjdHhfZnJtID0gRk9STUFUX0JJTkFSWTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJhY2VyLmV4dHJhY3QoY3R4X2ZybSwgY3R4X3NyYyk7XG4gICAgfVxuXG4gICAgc3RhdGljIGdldFBhcmVudFNwYW4odHJhY2VyOiBUcmFjZXIsIGNvbnRleHQ6IGFueSk6IChTcGFuQ29udGV4dCB8IHR5cGVvZiB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQudHJhY2VyUGFyZW50U3BhbjtcbiAgICB9XG5cbiAgICBzdGF0aWMgZmFpbGVkKHRyYWNlcjogVHJhY2VyLCBzcGFuOiBTcGFuLCBlcnJvcjogYW55KSB7XG4gICAgICAgIHNwYW4ubG9nKHtcbiAgICAgICAgICAgIGV2ZW50OiAnZmFpbGVkJyxcbiAgICAgICAgICAgIHBheWxvYWQ6IHRvTG9nKGVycm9yKSxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIGFzeW5jIHRyYWNlPFQ+KFxuICAgICAgICB0cmFjZXI6IFRyYWNlcixcbiAgICAgICAgbmFtZTogc3RyaW5nLFxuICAgICAgICBmOiAoc3BhbjogU3BhbikgPT4gUHJvbWlzZTxUPixcbiAgICAgICAgcGFyZW50U3Bhbj86IChTcGFuIHwgU3BhbkNvbnRleHQpLFxuICAgICk6IFByb21pc2U8VD4ge1xuICAgICAgICBjb25zdCBzcGFuID0gdHJhY2VyLnN0YXJ0U3BhbihuYW1lLCB7IGNoaWxkT2Y6IHBhcmVudFNwYW4gfSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzcGFuLnNldFRhZyhUYWdzLlNQQU5fS0lORCwgJ3NlcnZlcicpO1xuICAgICAgICAgICAgT2JqZWN0LmVudHJpZXMoUVRyYWNlci5jb25maWcuamFlZ2VyLnRhZ3MpLmZvckVhY2goKFtuYW1lLCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBzcGFuLnNldFRhZyhuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmKHNwYW4pO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgc3Bhbi5zZXRUYWcoJ3Jlc3VsdCcsIHRvTG9nKHJlc3VsdCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhbi5maW5pc2goKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBjbGVhbmVkID0gY2xlYW5FcnJvcihlcnJvcik7XG4gICAgICAgICAgICBRVHJhY2VyLmZhaWxlZCh0cmFjZXIsIHNwYW4sIGNsZWFuZWQpO1xuICAgICAgICAgICAgc3Bhbi5maW5pc2goKTtcbiAgICAgICAgICAgIHRocm93IGNsZWFuZWQ7XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=