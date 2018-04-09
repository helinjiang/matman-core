const fs = require('fs');
const fse = require('fs-extra');
// const fse = require('fs-extra');
const path = require('path');
const parserUtil = require('./parser-util');
const fsHandler = require('fs-handler');

const matmanConfig = {
  handleModulesFolderName: 'handle_modules',
  handlerConfigName: 'config.json',
  handleModuleConfigName: 'config.json',
  targetField: '_m_target'
};

function build(basePath, cacheData) {
  console.log(basePath, path.basename(basePath));

  //===============================================================
  // 1. 获得 handlerName 名字
  //===============================================================
  const handlerName = path.basename(basePath);

  //===============================================================
  // 2. 找到配置文件 config.json
  //===============================================================
  const CUR_HANDLER_PATH = basePath;
  const CUR_HANDLER_CONFIG = path.join(CUR_HANDLER_PATH, matmanConfig.handlerConfigName);

  // 注意：handler 的 config.json 可能不存在，此时需要提示错误
  // 它是必须的，用于指导如何匹配路由规则等
  if (!fs.existsSync(CUR_HANDLER_CONFIG)) {
    console.error(CUR_HANDLER_CONFIG + ' is not exist!');
    return null;
  }

  // 如果存在，则获取该 handler 的 config 文件信息
  let handlerConfigData = fse.readJsonSync(CUR_HANDLER_CONFIG);

  console.log(handlerConfigData);

  //===============================================================
  // 3. 获取 handler 模块基础信息
  //===============================================================
  // 将默认值+本地缓存+config.json三者的数据进行合并
  let handlerData = parserUtil.getMixinHandlerData(handlerName, handlerConfigData, cacheData);

  console.log('======handlerData=====', handlerData);

  //===============================================================
  // 4. 获取当前的 handler 下的 handle_modules 列表，或者 index.js/index.json
  //===============================================================
  const CUR_HANDLE_MODULE_PATH = path.join(CUR_HANDLER_PATH, matmanConfig.handleModulesFolderName);

  let modules = [];

  if (!fs.existsSync(CUR_HANDLE_MODULE_PATH)) {
    // 如果没有 handle_modules 文件夹，则使用 index.js 或者 index.json，且将其设置为默认
    let indexModule = {
      name: 'index_module',
      description: 'default module',
      priority: 0,
      type: 'noModule'
    };

    indexModule.query = { _m_target: indexModule.name };

    if (fs.existsSync(path.join(CUR_HANDLER_PATH, 'index.js'))) {
      indexModule.fileName = 'index.js';
    } else if (fs.existsSync(path.join(CUR_HANDLER_PATH, 'index.json'))) {
      indexModule.fileName = 'index.json';
    } else {
      return null;
    }

    modules.push(indexModule);
  } else {
    // 有 handle_modules 文件夹情况下，遍历其中的模块
    fsHandler.search.getAll(CUR_HANDLE_MODULE_PATH, { globs: ['*'] }).forEach((item) => {
      // 获取各个 handle_module 中 config.json 的数据
      let handleModuleConfig = {};
      let curHandleModuleName = '';

      if (item.isDirectory()) {
        // 如果是文件夹，则获取文件夹名字作为模块名
        curHandleModuleName = path.basename(item.relativePath);

        // 如果 handle_module 是一个目录，则需要去检查其是否存在 config.json 文件，优先使用它
        // config.json 的作用是用于用户自定义，拥有最高的优先级
        let CUR_HANDLE_MODULE_CONFIG = path.join(CUR_HANDLE_MODULE_PATH, curHandleModuleName, matmanConfig.handleModuleConfigName);

        if (fs.existsSync(CUR_HANDLE_MODULE_CONFIG)) {
          handleModuleConfig = fse.readJsonSync(CUR_HANDLE_MODULE_CONFIG);
        }
      } else {
        // 如果是文件，则获取文件名（不含后缀）作为模块名
        curHandleModuleName = path.basename(item.relativePath, path.extname(item.relativePath));
      }

      // 获取最后处理之后的数据
      let curHandleModuleData = parserUtil.getMixinHandleModuleData(curHandleModuleName, handleModuleConfig);

      modules.push(curHandleModuleData);
    });
  }

  // handle_modules 列表
  handlerData.modules = modules;

  //===============================================================
  // 5. 其他默认处理
  //===============================================================

  // 如果不存在默认的 activeModule，或者存在默认的 activeModule，但是它是一个非法值，则设置第一个 handle_module 为默认
  if ((!handlerData.activeModule || (modules.map(item => item.name).indexOf(handlerData.activeModule) < 0)) && modules.length) {
    handlerData.activeModule = modules[0].name;
  }

  //===============================================================
  // 6. 合并返回
  //===============================================================

  console.log(handlerData) ;

}

build(path.resolve(__dirname, '../demo/before'));