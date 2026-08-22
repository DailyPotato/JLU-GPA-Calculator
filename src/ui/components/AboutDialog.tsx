import { DeleteOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Divider, Modal, Typography } from 'antd';

interface Props {
  open: boolean;
  onClose: () => void;
  onResetAll: () => void;
}

export function AboutDialog({ open, onClose, onResetAll }: Props) {
  return (
    <Modal
      open={open}
      title="关于 JLU GPA"
      footer={null}
      width={560}
      className="about-dialog"
      onCancel={onClose}
    >
      <Alert
        type="info"
        showIcon
        className="about-privacy-alert"
        message="本网站所有数据均在本地处理与缓存，不会收集您的信息。"
      />
      <Typography.Paragraph>
        面向吉林大学本科生的本地优先绩点核算工具，成绩只在浏览器中处理，可计算保研
        GPA、加权平均分和算术平均分。
      </Typography.Paragraph>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="版本">正式版 v1.0.1</Descriptions.Item>
        <Descriptions.Item label="项目地址">
          <Typography.Link
            href="https://github.com/DailyPotato/JLU-GPA-Calculator"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://github.com/DailyPotato/JLU-GPA-Calculator
          </Typography.Link>
        </Descriptions.Item>
        <Descriptions.Item label="作者">DailyPotato</Descriptions.Item>
        <Descriptions.Item label="共同作者">Coldymemos</Descriptions.Item>
        <Descriptions.Item label="开源与使用">
          本项目基于 GPL v3.0 协议开源，仅供学习与个人使用，请勿用于商业用途。
        </Descriptions.Item>
      </Descriptions>
      <Divider plain className="about-reset-divider">
        数据管理
      </Divider>
      <Button danger block icon={<DeleteOutlined />} onClick={onResetAll}>
        清空全部数据
      </Button>
      <Typography.Paragraph type="secondary" className="about-disclaimer">
        普瑞赛斯正在看着你哦
      </Typography.Paragraph>
    </Modal>
  );
}
