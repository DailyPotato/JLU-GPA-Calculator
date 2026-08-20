import { Descriptions, Modal, Typography } from 'antd';
import type { AppRuleSet } from '../../domain/rules/rule-set.types';

interface Props {
  open: boolean;
  rules: AppRuleSet;
  onClose: () => void;
}

export function AboutDialog({ open, rules, onClose }: Props) {
  return (
    <Modal open={open} title="关于 JLU GPA" footer={null} width={560} onCancel={onClose}>
      <Typography.Paragraph>
        面向吉林大学本科生的本地成绩核算工具，可计算保研 GPA、加权平均分和算术平均分。
      </Typography.Paragraph>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="当前规则">{rules.name}</Descriptions.Item>
        <Descriptions.Item label="规则版本">{rules.version}</Descriptions.Item>
        <Descriptions.Item label="数据存储">
          课程和设置保存在当前浏览器的 IndexedDB 中，成绩文件不会上传服务器。
        </Descriptions.Item>
      </Descriptions>
      <Typography.Paragraph type="secondary" className="about-disclaimer">
        本项目不是吉林大学官方系统。不同学院、专业和年份的具体要求可能不同，请以适用于本人的正式文件为准。
      </Typography.Paragraph>
    </Modal>
  );
}
