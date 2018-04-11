const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const fsHandler = require('fs-handler');
const babelD = require('babel-d');

/**
 * 进行序列化处理，包括babel处理
 * @param {String} srcPath 本地路径
 * @param {String} distPath 处理之后保存的路径
 * @param {Object} [options] 额外参数
 * @param {String} [options.handlerConfigPath] handler的config.json文件，绝对路径，默认为 ${srcPath}/config.json
 * @param {String} [options.handleModuleBasePath] handle_module的根目录，绝对路径，默认为 ${srcPath}/handle_modules
 * @param {String} [options.handleModuleConfigRelativePath] handle_module的config.json文件，相对路径，默认为 ./config.json
 * @param {String} [options.customCode] 用户自定义的代码
 * @param {String} [options.debug] 是否开启 debug 模式，该值为 true 时，将打印一些log日志
 */
export default function build(srcPath, distPath, options = {}) {
  if (options.debug) {
    console.log('\nBegin build...', srcPath, distPath, options);
  }

  let result = ['export const isSerialized = true;'];

  result.push(`export const PATH = __dirname;`);

  //===============================================================
  // 1. 配置文件 config.json
  //===============================================================
  const HANDLER_CONFIG_PATH = options.handlerConfigPath || path.join(srcPath, 'config.json');

  // 注意：handler 的 config.json 可能不存在，此时需要提示错误
  // 它是必须的，用于指导如何匹配路由规则等
  if (!fs.existsSync(HANDLER_CONFIG_PATH)) {
    if (options.debug) {
      console.error(HANDLER_CONFIG_PATH + ' is not exist!');
    }

    throw new Error(HANDLER_CONFIG_PATH + ' is not exist!');
  }

  if (options.debug) {
    console.log('Exist HANDLER_CONFIG_PATH=' + HANDLER_CONFIG_PATH);
  }

  // 导出 config 文件内容
  result.push(`import config from './config';`);
  result.push(`export config from './config';`);

  // 如果 config 文件定义了名字，则优先使用，否则将使用当前文件夹名字
  result.push(`export const name = config.name || '${ path.basename(srcPath)}';`);
  // result.push(`export const name = '${ path.basename(srcPath)}';`);

  //===============================================================
  // 2. 获取当前的 handler 下的 handle_modules 列表，或者 index.js/index.json
  //===============================================================
  const HANDLE_MODULE_BASE_PATH = options.handleModuleBasePath || path.join(srcPath, 'handle_modules');

  if (options.debug) {
    console.log('HANDLE_MODULE_BASE_PATH=' + HANDLE_MODULE_BASE_PATH);
  }

  let modules = [];

  if (fs.existsSync(HANDLE_MODULE_BASE_PATH)) {
    // 有 handle_modules 文件夹情况下，遍历其中的模块
    fsHandler.search.getAll(HANDLE_MODULE_BASE_PATH, { globs: ['*'] }).forEach((item) => {
      // 获取各个 handle_module 中 config.json 的数据
      let curHandleModuleConfigName = '';
      let curHandleModuleName = '';

      if (item.isDirectory()) {
        // 如果是文件夹，则获取文件夹名字作为模块名
        curHandleModuleName = path.basename(item.relativePath);

        // 如果存在 config 文件，则设置config信息
        let handleModuleRelativePath = path.join(curHandleModuleName, options.handleModuleConfigRelativePath || './config.json');

        if (fs.existsSync(path.join(HANDLE_MODULE_BASE_PATH, handleModuleRelativePath))) {
          curHandleModuleConfigName = `${curHandleModuleName}_config`;
          result.push(`import ${curHandleModuleConfigName} from './handle_modules/${handleModuleRelativePath.replace(/\\/gi, '/')}';`);
        }
      } else {
        // 如果是文件，则获取文件名（不含后缀）作为模块名
        curHandleModuleName = path.basename(item.relativePath, path.extname(item.relativePath));
      }

      if (options.debug) {
        console.log('curHandleModuleName=' + curHandleModuleName + ',curHandleModuleConfigName=' + curHandleModuleConfigName);
      }

      result.push(`import ${curHandleModuleName} from './handle_modules/${curHandleModuleName}'`);

      modules.push(`{name: '${curHandleModuleName}', module: ${curHandleModuleName}, config: ${curHandleModuleConfigName || null}}`);
    });
  }

  if (options.debug) {
    console.log('handleModules.length=' + modules.length);
  }

  if (modules.length) {
    result.push(`export const handleModules = [${modules.join(',')}]`);
  } else {
    result.push(`export const handleModules = []`);
  }

  //===============================================================
  // 3. 用户自定义代码
  //===============================================================
  if (options.customCode) {
    result.push(options.customCode);
  }

  //===============================================================
  // 4. 生成新的 index.js 文件
  //===============================================================
  // 源码文件先存储一份
  let content = result.join('\n');
  fse.ensureDirSync(distPath);
  fse.outputFileSync(path.join(distPath, 'index.bak'), content);

  if (options.debug) {
    console.log(path.join(distPath, 'index.bak') + ' save success!');
  }

  // babel 之后的文件存储一份
  let data = babelD.babelCompile.compileByBabel(content);
  fse.outputFileSync(path.join(distPath, 'index.js'), data.code);
  // console.log(data.code);

  if (options.debug) {
    console.log(path.join(distPath, 'index.js') + ' save success!');
  }

  //===============================================================
  // 5. 把所有的文件都 babel 转义
  //===============================================================
  babelD(srcPath, distPath, { debug: options.debug });

  if (options.debug) {
    console.log('Build end!\n');
  }
}

