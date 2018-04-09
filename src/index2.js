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
  // 2. 找到配置文件 config.json
  //===============================================================
  const CUR_HANDLER_PATH = srcPath;
  const CUR_HANDLER_CONFIG = path.join(CUR_HANDLER_PATH, matmanConfig.handlerConfigName);

  // 注意：handler 的 config.json 可能不存在，此时需要提示错误
  // 它是必须的，用于指导如何匹配路由规则等
  if (!fs.existsSync(CUR_HANDLER_CONFIG)) {
    console.error(CUR_HANDLER_CONFIG + ' is not exist!');
    return null;
  }

  result.push(`import config from './config';`);
  result.push(`export config from './config';`);
  result.push(`export const name = config.name;`);

  //===============================================================
  // 4. 获取当前的 handler 下的 handle_modules 列表，或者 index.js/index.json
  //===============================================================
  const CUR_HANDLE_MODULE_PATH = path.join(srcPath, matmanConfig.handleModulesFolderName);

  let modules = [];

  if (fs.existsSync(CUR_HANDLE_MODULE_PATH)) {
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
          result.push(`import ${curHandleModuleName}_config from './handle_modules/${curHandleModuleName}/${matmanConfig.handleModuleConfigName}'`);
        }
      } else {
        // 如果是文件，则获取文件名（不含后缀）作为模块名
        curHandleModuleName = path.basename(item.relativePath, path.extname(item.relativePath));
      }

      result.push(`import ${curHandleModuleName} from './handle_modules/${curHandleModuleName}'`);

      // let obj = {
      //   name: 'error',
      //     module: error,
      //   config: null
      // }
    });
  }

  let distPath = path.resolve(srcPath, '../after');

  // 源码文件先存储一份
  let content = result.join('\n');
  fse.ensureDirSync(distPath);
  fse.outputFileSync(path.join(distPath, 'index.bak'), content);

  // babel 之后的文件存储一份
  let data = babelD.babelCompile.compileByBabel(content);
  fse.outputFileSync(path.join(distPath, 'index2.js'), data.code);
  // console.log(data.code);

  // 把所有的文件都 babel 转义
  // babelD(srcPath, distPath);
}

build(path.resolve(__dirname, '../demo/before'));