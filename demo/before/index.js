import config from './config';

export config from './config';

import error from './handle_modules/error';
import success_1 from './handle_modules/success_1';
import success_2 from './handle_modules/success_2';
import success_3 from './handle_modules/success_3';
import success_3_config from './handle_modules/success_3/config';
import success_4 from './handle_modules/success_4';
import success_4_config from './handle_modules/success_4/config';

export const handleModules = [{
  name: 'error',
  module: error,
  config: null
}, {
  name: 'success_1',
  module: success_1,
  config: null
}, {
  name: 'success_2',
  module: success_2,
  config: null
}, {
  name: 'success_3',
  module: success_3,
  config: success_3_config
}, {
  name: 'success_4',
  module: success_4,
  config: success_4_config
}];

export const isNpm = true;
export const name = config.name;