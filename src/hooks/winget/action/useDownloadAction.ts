import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { message } from 'antd';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useState,
} from 'react';
import { useLogTerminal } from '../../useLogTerminal.ts';
import { DEFAULT_DOWNLOAD_FLAGS } from '../../../services/winget/constants';
import { downloadStream } from '../../../services/winget/package';
import {
  checkProxySettings,
  enableProxySettings,
  stopTask,
} from '../../../services/winget/system';
import { useConfigSync } from '../../../sync/configSync.ts';
import type {
  WingetFinishedPayload,
  WingetLogPayload,
  WingetPackage,
} from '../../../types/winget.ts';
import { buildWingetFlags } from '../../../utils/modalUtils';

/**
 * useDownloadAction 返回值的类型 definition
 */
export interface UseDownloadActionReturn {
  /** 下载弹窗是否打开 */
  downloadModalOpen: boolean;
  /** 设置下载弹窗打开状态的方法 */
  setDownloadModalOpen: Dispatch<SetStateAction<boolean>>;
  /** 当前待下载的目标对象信息 */
  downloadTarget: WingetPackage | null;
  /** 下载进程是否正在运行 */
  downloadRunning: boolean;
  /** 选择的安装程序下载目录路径 */
  downloadDir: string;
  /** 是否保留生成的 YAML 配置文件 */
  keepYaml: boolean;
  /** 设置是否保留 YAML 的方法 */
  setKeepYaml: Dispatch<SetStateAction<boolean>>;
  /** 下载日志展示区域的 DOM 引用 */
  downloadLogBoxRef: RefObject<HTMLDivElement | null>;
  /** 下载日志滚动区域的 DOM 引用 */
  downloadLogScrollRef: RefObject<HTMLDivElement | null>;
  /** 触发下载流程，选择目录并打开弹窗。r: 待下载的软件条目 */
  handleDownloadInstaller: (r: WingetPackage) => Promise<void>;
  /** 正式开始执行 winget 下载流命令 */
  startDownloadExecution: () => Promise<void>;
  /** 手动终止正在进行的下载进程 */
  handleStopDownload: () => Promise<void>;
}

/**
 * Winget 下载安装程序 logic Hook
 * 负责处理软件安装包下载相关的目录选择、状态管理及下载流监听
 */
export function useDownloadAction(): UseDownloadActionReturn {
  const { data: config } = useConfigSync();

  // 下载弹窗开关
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);
  // 当前下载目标信息
  const [downloadTarget, setDownloadTarget] = useState<WingetPackage | null>(
    null,
  );
  // 下载进程是否运行中
  const [downloadRunning, setDownloadRunning] = useState<boolean>(false);
  // 下载保存目录
  const [downloadDir, setDownloadDir] = useState<string>('');
  // 是否保留 YAML 描述文件
  const [keepYaml, setKeepYaml] = useState<boolean>(false);

  const {
    logBoxRef: downloadLogBoxRef,
    logScrollRef: downloadLogScrollRef,
    clear: clearDownloadLog,
    append: appendDownloadLog,
    cleanupListeners: cleanupDownloadListeners,
    setUnlistenLog: setUnlistenDownloadLog,
    setUnlistenFinish: setUnlistenDownloadFinish,
  } = useLogTerminal();

  /**
   * 打开下载目录选择对话框并显示弹窗
   * @param {WingetPackage} r - 待下载的软件条目对象
   */
  async function handleDownloadInstaller(r: WingetPackage): Promise<void> {
    try {
      // 1. 调用 Tauri Dialog 插件打开文件夹选择器
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择安装程序下载目录',
      });

      if (!selected) return;

      // 2. 记录目录和目标，开启弹窗
      setDownloadDir(selected as string);
      setDownloadTarget(r);
      setDownloadModalOpen(true);
      setDownloadRunning(false);

      // 异步清空之前的日志，确保 DOM 已渲染
      setTimeout(() => {
        clearDownloadLog();
      }, 0);
    } catch (e) {
      const err = e as Error;
      message.error(`打开对话框失败: ${err.message || String(e)}`);
    }
  }

  /**
   * 开始执行下载流
   */
  async function startDownloadExecution(): Promise<void> {
    if (!downloadTarget || !downloadDir) return;
    setDownloadRunning(true);
    const id = downloadTarget.id;

    // 1. 如果启用了代理，检查并确保 ProxyCommandLineOptions 已开启
    if (config.useProxy) {
      try {
        const isEnabled = await checkProxySettings();
        if (!isEnabled) {
          message.info('正在尝试启用代理设置...');
          try {
            await enableProxySettings();
            message.success('代理设置已启用');
          } catch (enableError) {
            const err = enableError as Error;
            message.warning(
              `启用代理设置失败: ${err.message || String(enableError)}。代理参数可能无法正常工作。`,
            );
          }
        }
      } catch (checkError) {
        const err = checkError as Error;
        message.warning(
          `检查代理设置失败: ${err.message || String(checkError)}。将尝试直接使用代理参数。`,
        );
      }
    }

    // 2. 监听下载日志输出
    const unlistenLog = await listen<WingetLogPayload>(
      'winget-download-log',
      (ev) => {
        const p = ev.payload;
        if (p && p.id === id && typeof p.line === 'string') {
          appendDownloadLog(p.line);
        }
      },
    );

    // 3. 监听下载结束事件
    const unlistenFinish = await listen<WingetFinishedPayload>(
      'winget-download-finished',
      (ev) => {
        const p = ev.payload;
        if (p && p.id === id) {
          setDownloadRunning(false);
          if (p.success) message.success('安装程序下载成功');
          else message.error('安装程序下载失败');
          cleanupDownloadListeners();
        }
      },
    );

    setUnlistenDownloadLog(unlistenLog);
    setUnlistenDownloadFinish(unlistenFinish);

    // 构建 Winget 参数
    const flags = buildWingetFlags(DEFAULT_DOWNLOAD_FLAGS, {
      useProxy: config.useProxy,
      proxyUrl: `http://${config.proxyHost}:${config.proxyPort}`,
    });

    try {
      // 调用后端下载流接口
      await downloadStream(
        id,
        downloadTarget.source,
        downloadDir,
        flags,
        keepYaml,
      );
    } catch (e) {
      const err = e as Error;
      message.error(err.message || String(e));
      setDownloadRunning(false);
      cleanupDownloadListeners();
    }
  }

  /**
   * 终止下载进程
   */
  async function handleStopDownload(): Promise<void> {
    if (!downloadTarget) return;
    try {
      // 复用终止命令
      await stopTask(downloadTarget.id);
      message.warning('已请求终止下载');
    } catch (e) {
      const err = e as Error;
      message.error(err.message || String(e));
    }
  }

  return {
    downloadModalOpen,
    setDownloadModalOpen,
    downloadTarget,
    downloadRunning,
    downloadDir,
    keepYaml,
    setKeepYaml,
    downloadLogBoxRef,
    downloadLogScrollRef,
    handleDownloadInstaller,
    startDownloadExecution,
    handleStopDownload,
  };
}
