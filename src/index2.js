const fs = require('fs');
const fse = require('fs-extra');
// const fse = require('fs-extra');
const path = require('path');
const parserUtil = require('./parser-util');
const fsHandler = require('fs-handler');

const babelD = require('babel-d');

const matmanConfig = {
  handleModulesFolderName: 'handle_modules',
  handlerConfigName: 'config.json',
  handleModuleConfigName: 'config.json',
  targetField: '_m_target'
};

function build(srcPath) {
  let result = ['export const isNpm = true;'];

  console.log(srcPath, path.basename(srcPath));

  //===============================================================
  // 1. 配置文件 config.json
  //===============================================================
  const CUR_HANDLER_CONFIG = path.join(srcPath, matmanConfig.handlerConfigName);

  // 注意：handler 的 config.json 可能不存在，此时需要提示错误
  // 它是必须的，用于指导如何匹配路由规则等
  if (!fs.existsSync(CUR_HANDLER_CONFIG)) {
    throw new Error(CUR_HANDLER_CONFIG + ' is not exist!');
  }

  // 导出 config 文件内容
  result.push(`import config from './config';`);
  result.push(`export config from './config';`);
  result.push(`export const name = config.name;`);

  //===============================================================
  // 2. 获取当前的 handler 下的 handle_modules 列表，或者 index.js/index.json
  //===============================================================
  const CUR_HANDLE_MODULE_PATH = path.join(srcPath, matmanConfig.handleModulesFolderName);

  let modules = [];

  if (fs.existsSync(CUR_HANDLE_MODULE_PATH)) {
    // 有 handle_modules 文件夹情况下，遍历其中的模块
    fsHandler.search.getAll(CUR_HANDLE_MODULE_PATH, { globs: ['*'] }).forEach((item) => {
      // 获取各个 handle_module 中 config.json 的数据
      let curHandleModuleConfigName = '';
      let curHandleModuleName = '';

      if (item.isDirectory()) {
        // 如果是文件夹，则获取文件夹名字作为模块名
        curHandleModuleName = path.basename(item.relativePath);

        // 如果存在 config 文件，则设置config信息
        let CUR_HANDLE_MODULE_CONFIG = path.join(CUR_HANDLE_MODULE_PATH, curHandleModuleName, matmanConfig.handleModuleConfigName);
        if (fs.existsSync(CUR_HANDLE_MODULE_CONFIG)) {
          curHandleModuleConfigName = `${curHandleModuleName}_config`;
          result.push(`import ${curHandleModuleConfigName} from './handle_modules/${curHandleModuleName}/${matmanConfig.handleModuleConfigName}';`);
        }
      } else {
        // 如果是文件，则获取文件名（不含后缀）作为模块名
        curHandleModuleName = path.basename(item.relativePath, path.extname(item.relativePath));
      }

      result.push(`import ${curHandleModuleName} from './handle_modules/${curHandleModuleName}'`);

      modules.push(`{name: '${curHandleModuleName}', module: ${curHandleModuleName}, config: ${curHandleModuleConfigName || null}}`);
    });
  }

  if (modules.length) {
    result.push(`export const handleModules = [${modules.join(',')}]`);
  } else {
    result.push(`export const handleModules = []`);
  }

  //===============================================================
  // 3. 生成新的 index.js 文件
  //===============================================================
  let distPath = path.resolve(srcPath, '../after');

  // 源码文件先存储一份
  let content = result.join('\n');
  fse.ensureDirSync(distPath);
  fse.outputFileSync(path.join(distPath, 'index.bak'), content);

  // babel 之后的文件存储一份
  let data = babelD.babelCompile.compileByBabel(content);
  fse.outputFileSync(path.join(distPath, 'index2.js'), data.code);
  // console.log(data.code);

  //===============================================================
  // 4. 把所有的文件都 babel 转义
  //===============================================================
  babelD(srcPath, distPath);
}

build(path.resolve(__dirname, '../demo/before'));