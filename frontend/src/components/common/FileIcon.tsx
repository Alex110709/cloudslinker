import React from 'react';
import {
  FileOutlined,
  FolderOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileZipOutlined,
  FileTextOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { getFileCategory, getFileExtension } from '../../utils';

export interface FileIconProps {
  fileName: string;
  fileType?: 'file' | 'folder';
  size?: number;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({
  fileName,
  fileType = 'file',
  size = 16,
  className = '',
}) => {
  const iconStyle = { fontSize: size };
  const iconProps = {
    style: iconStyle,
    className,
  };

  // Handle folder type
  if (fileType === 'folder') {
    return <FolderOutlined {...iconProps} />;
  }

  // Get file extension and category
  const extension = getFileExtension(fileName).toLowerCase();
  const category = getFileCategory(fileName);

  // Handle specific file extensions
  switch (extension) {
    case 'pdf':
      return <FilePdfOutlined {...iconProps} />;
    case 'doc':
    case 'docx':
      return <FileWordOutlined {...iconProps} />;
    case 'xls':
    case 'xlsx':
      return <FileExcelOutlined {...iconProps} />;
    case 'ppt':
    case 'pptx':
      return <FilePptOutlined {...iconProps} />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'bz2':
      return <FileZipOutlined {...iconProps} />;
    case 'txt':
    case 'md':
    case 'readme':
      return <FileTextOutlined {...iconProps} />;
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'scss':
    case 'sass':
    case 'json':
    case 'xml':
    case 'yaml':
    case 'yml':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'h':
    case 'php':
    case 'rb':
    case 'go':
    case 'rs':
    case 'sh':
    case 'sql':
      return <CodeOutlined {...iconProps} />;
  }

  // Handle by category
  switch (category) {
    case 'image':
      return <FileImageOutlined {...iconProps} />;
    case 'video':
      return <VideoCameraOutlined {...iconProps} />;
    case 'audio':
      return <AudioOutlined {...iconProps} />;
    case 'document':
      return <FileTextOutlined {...iconProps} />;
    case 'archive':
      return <FileZipOutlined {...iconProps} />;
    default:
      return <FileOutlined {...iconProps} />;
  }
};

export default FileIcon;", "original_text": ""}]