"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _utils = require("./utils");

/*
 * Copyright 2018-2020 TON DEV SOLUTIONS LTD.
 *
 * Licensed under the SOFTWARE EVALUATION License (the "License"); you may not use
 * this file except in compliance with the License.  You may obtain a copy of the
 * License at:
 *
 * http://www.ton.dev/licenses
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific TON DEV software governing permissions and
 * limitations under the License.
 */
function toJSON(value) {
  try {
    return JSON.stringify((0, _utils.toLog)(value));
  } catch (error) {
    return JSON.stringify(`${value}`);
  }
}

function str(arg) {
  const s = typeof arg === 'string' ? arg : toJSON(arg);
  return s.split('\n').join('\\n').split('\t').join('\\t');
}

function format(name, args) {
  return `${Date.now()}\t${name}\t${args.map(str).join('\t')}`;
}

class QLogs {
  static error(...args) {
    if (QLogs.stopped) {
      return;
    }

    console.error(...args);
  }

  static debug(...args) {
    if (QLogs.stopped) {
      return;
    }

    console.debug(...args);
  }

  create(name) {
    return {
      error(...args) {
        QLogs.error(...args);
      },

      debug(...args) {
        QLogs.debug(format(name, args));
      }

    };
  }

  stop() {
    QLogs.stopped = true;
  }

}

exports.default = QLogs;
QLogs.stopped = false;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NlcnZlci9sb2dzLmpzIl0sIm5hbWVzIjpbInRvSlNPTiIsInZhbHVlIiwiSlNPTiIsInN0cmluZ2lmeSIsImVycm9yIiwic3RyIiwiYXJnIiwicyIsInNwbGl0Iiwiam9pbiIsImZvcm1hdCIsIm5hbWUiLCJhcmdzIiwiRGF0ZSIsIm5vdyIsIm1hcCIsIlFMb2dzIiwic3RvcHBlZCIsImNvbnNvbGUiLCJkZWJ1ZyIsImNyZWF0ZSIsInN0b3AiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFrQkE7O0FBbEJBOzs7Ozs7Ozs7Ozs7Ozs7QUF5QkEsU0FBU0EsTUFBVCxDQUFnQkMsS0FBaEIsRUFBb0M7QUFDaEMsTUFBSTtBQUNBLFdBQU9DLElBQUksQ0FBQ0MsU0FBTCxDQUFlLGtCQUFNRixLQUFOLENBQWYsQ0FBUDtBQUNILEdBRkQsQ0FFRSxPQUFPRyxLQUFQLEVBQWM7QUFDWixXQUFPRixJQUFJLENBQUNDLFNBQUwsQ0FBZ0IsR0FBRUYsS0FBTSxFQUF4QixDQUFQO0FBQ0g7QUFDSjs7QUFFRCxTQUFTSSxHQUFULENBQWFDLEdBQWIsRUFBK0I7QUFDM0IsUUFBTUMsQ0FBQyxHQUFHLE9BQU9ELEdBQVAsS0FBZSxRQUFmLEdBQTBCQSxHQUExQixHQUFnQ04sTUFBTSxDQUFDTSxHQUFELENBQWhEO0FBQ0EsU0FBT0MsQ0FBQyxDQUFDQyxLQUFGLENBQVEsSUFBUixFQUFjQyxJQUFkLENBQW1CLEtBQW5CLEVBQTBCRCxLQUExQixDQUFnQyxJQUFoQyxFQUFzQ0MsSUFBdEMsQ0FBMkMsS0FBM0MsQ0FBUDtBQUNIOztBQUVELFNBQVNDLE1BQVQsQ0FBZ0JDLElBQWhCLEVBQThCQyxJQUE5QixFQUE4QztBQUMxQyxTQUFRLEdBQUVDLElBQUksQ0FBQ0MsR0FBTCxFQUFXLEtBQUlILElBQUssS0FBSUMsSUFBSSxDQUFDRyxHQUFMLENBQVNWLEdBQVQsRUFBY0ksSUFBZCxDQUFtQixJQUFuQixDQUF5QixFQUEzRDtBQUNIOztBQUVjLE1BQU1PLEtBQU4sQ0FBWTtBQUV2QixTQUFPWixLQUFQLENBQWEsR0FBR1EsSUFBaEIsRUFBMkI7QUFDdkIsUUFBSUksS0FBSyxDQUFDQyxPQUFWLEVBQW1CO0FBQ2Y7QUFDSDs7QUFDREMsSUFBQUEsT0FBTyxDQUFDZCxLQUFSLENBQWMsR0FBR1EsSUFBakI7QUFDSDs7QUFDRCxTQUFPTyxLQUFQLENBQWEsR0FBR1AsSUFBaEIsRUFBMkI7QUFDdkIsUUFBSUksS0FBSyxDQUFDQyxPQUFWLEVBQW1CO0FBQ2Y7QUFDSDs7QUFDREMsSUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsR0FBR1AsSUFBakI7QUFDSDs7QUFDSlEsRUFBQUEsTUFBTSxDQUFDVCxJQUFELEVBQXFCO0FBQ3ZCLFdBQU87QUFDVFAsTUFBQUEsS0FBSyxDQUFDLEdBQUdRLElBQUosRUFBVTtBQUNkSSxRQUFBQSxLQUFLLENBQUNaLEtBQU4sQ0FBWSxHQUFHUSxJQUFmO0FBQ0EsT0FIUTs7QUFJVE8sTUFBQUEsS0FBSyxDQUFDLEdBQUdQLElBQUosRUFBVTtBQUNkSSxRQUFBQSxLQUFLLENBQUNHLEtBQU4sQ0FBWVQsTUFBTSxDQUFDQyxJQUFELEVBQU9DLElBQVAsQ0FBbEI7QUFDQTs7QUFOUSxLQUFQO0FBUUg7O0FBQ0RTLEVBQUFBLElBQUksR0FBRztBQUNBTCxJQUFBQSxLQUFLLENBQUNDLE9BQU4sR0FBZ0IsSUFBaEI7QUFDSDs7QUExQnNCOzs7QUE2QjNCRCxLQUFLLENBQUNDLE9BQU4sR0FBZ0IsS0FBaEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IDIwMTgtMjAyMCBUT04gREVWIFNPTFVUSU9OUyBMVEQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIFNPRlRXQVJFIEVWQUxVQVRJT04gTGljZW5zZSAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlXG4gKiB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGVcbiAqIExpY2Vuc2UgYXQ6XG4gKlxuICogaHR0cDovL3d3dy50b24uZGV2L2xpY2Vuc2VzXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBUT04gREVWIHNvZnR3YXJlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbi8vIEBmbG93XG5cbmltcG9ydCB7IHRvTG9nIH0gZnJvbSBcIi4vdXRpbHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBRTG9nIHtcbiAgICBlcnJvciguLi5hcmdzOiBhbnkpOiB2b2lkLFxuICAgIGRlYnVnKC4uLmFyZ3M6IGFueSk6IHZvaWQsXG59XG5cbmZ1bmN0aW9uIHRvSlNPTih2YWx1ZTogYW55KTogc3RyaW5nIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodG9Mb2codmFsdWUpKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYCR7dmFsdWV9YCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzdHIoYXJnOiBhbnkpOiBzdHJpbmcge1xuICAgIGNvbnN0IHMgPSB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyA/IGFyZyA6IHRvSlNPTihhcmcpO1xuICAgIHJldHVybiBzLnNwbGl0KCdcXG4nKS5qb2luKCdcXFxcbicpLnNwbGl0KCdcXHQnKS5qb2luKCdcXFxcdCcpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXQobmFtZTogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkge1xuICAgIHJldHVybiBgJHtEYXRlLm5vdygpfVxcdCR7bmFtZX1cXHQke2FyZ3MubWFwKHN0cikuam9pbignXFx0Jyl9YDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUUxvZ3Mge1xuICAgIHN0YXRpYyBzdG9wcGVkOiBib29sZWFuO1xuICAgIHN0YXRpYyBlcnJvciguLi5hcmdzOiBhbnkpIHtcbiAgICAgICAgaWYgKFFMb2dzLnN0b3BwZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmVycm9yKC4uLmFyZ3MpO1xuICAgIH1cbiAgICBzdGF0aWMgZGVidWcoLi4uYXJnczogYW55KSB7XG4gICAgICAgIGlmIChRTG9ncy5zdG9wcGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5kZWJ1ZyguLi5hcmdzKTtcbiAgICB9XG5cdGNyZWF0ZShuYW1lOiBzdHJpbmcpOiBRTG9nIHtcblx0ICAgIHJldHVybiB7XG5cdFx0XHRlcnJvciguLi5hcmdzKSB7XG5cdFx0XHRcdFFMb2dzLmVycm9yKC4uLmFyZ3MpO1xuXHRcdFx0fSxcblx0XHRcdGRlYnVnKC4uLmFyZ3MpIHtcblx0XHRcdFx0UUxvZ3MuZGVidWcoZm9ybWF0KG5hbWUsIGFyZ3MpKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cdHN0b3AoKSB7XG4gICAgICAgIFFMb2dzLnN0b3BwZWQgPSB0cnVlO1xuICAgIH1cbn1cblxuUUxvZ3Muc3RvcHBlZCA9IGZhbHNlO1xuIl19