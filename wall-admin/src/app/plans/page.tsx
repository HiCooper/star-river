'use client';

import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, InputNumber, Select, Space, message, Badge, Typography, Popover } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface Offer {
  id: string;
  name: string;
  type: 'discount' | 'coupon' | 'bonus';
  value: string;
}

interface Feature {
  id: string;
  name: string;
  unlocked: boolean;
}

interface Paywall {
  id: string;
  name: string;
}

interface PlanRecord {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: 'CNY' | 'USD';
  interval: 'month' | 'quarter' | 'year' | 'lifetime';
  trialDays: number;
  subscribers: number;
  status: 'active' | 'inactive';
  offers: Offer[];
  features: Feature[];
  paywalls: Paywall[];
}

const mockData: PlanRecord[] = [
  {
    id: 'plan-001',
    name: '月度专业版',
    price: 29.9,
    originalPrice: 39.9,
    currency: 'CNY',
    interval: 'month',
    trialDays: 7,
    subscribers: 1250,
    status: 'active',
    offers: [
      { id: 'offer-001', name: '首发特惠', type: 'discount', value: '立减10元' },
      { id: 'offer-002', name: '邀请好友', type: 'coupon', value: '再减5元' },
    ],
    features: [
      { id: 'f-001', name: '高级分析', unlocked: true },
      { id: 'f-002', name: '自定义报表', unlocked: true },
      { id: 'f-003', name: 'API访问', unlocked: false },
    ],
    paywalls: [
      { id: 'pw-001', name: '首页付费墙' },
      { id: 'pw-002', name: '功能页付费墙' },
    ],
  },
  {
    id: 'plan-002',
    name: '年度专业版',
    price: 299,
    originalPrice: 399,
    currency: 'CNY',
    interval: 'year',
    trialDays: 14,
    subscribers: 856,
    status: 'active',
    offers: [
      { id: 'offer-003', name: '年付7折', type: 'discount', value: '7折' },
    ],
    features: [
      { id: 'f-001', name: '高级分析', unlocked: true },
      { id: 'f-002', name: '自定义报表', unlocked: true },
      { id: 'f-003', name: 'API访问', unlocked: true },
      { id: 'f-004', name: '优先客服', unlocked: true },
    ],
    paywalls: [
      { id: 'pw-001', name: '首页付费墙' },
    ],
  },
  {
    id: 'plan-003',
    name: '终身高级版',
    price: 999,
    currency: 'CNY',
    interval: 'lifetime',
    trialDays: 0,
    subscribers: 234,
    status: 'active',
    offers: [],
    features: [
      { id: 'f-001', name: '高级分析', unlocked: true },
      { id: 'f-002', name: '自定义报表', unlocked: true },
      { id: 'f-003', name: 'API访问', unlocked: true },
      { id: 'f-004', name: '优先客服', unlocked: true },
      { id: 'f-005', name: '定制开发', unlocked: true },
    ],
    paywalls: [
      { id: 'pw-002', name: '功能页付费墙' },
    ],
  },
  {
    id: 'plan-004',
    name: '月度基础版',
    price: 9.9,
    currency: 'CNY',
    interval: 'month',
    trialDays: 3,
    subscribers: 3420,
    status: 'inactive',
    offers: [],
    features: [
      { id: 'f-001', name: '高级分析', unlocked: false },
      { id: 'f-002', name: '自定义报表', unlocked: false },
      { id: 'f-003', name: 'API访问', unlocked: false },
    ],
    paywalls: [],
  },
  {
    id: 'plan-005',
    name: '季度企业版',
    price: 79.9,
    originalPrice: 99.9,
    currency: 'USD',
    interval: 'quarter',
    trialDays: 30,
    subscribers: 89,
    status: 'active',
    offers: [
      { id: 'offer-004', name: '限时8折', type: 'discount', value: '8折' },
    ],
    features: [
      { id: 'f-001', name: '高级分析', unlocked: true },
      { id: 'f-002', name: '自定义报表', unlocked: true },
      { id: 'f-003', name: 'API访问', unlocked: true },
      { id: 'f-004', name: '优先客服', unlocked: true },
    ],
    paywalls: [
      { id: 'pw-001', name: '首页付费墙' },
      { id: 'pw-003', name: '企业版专属墙' },
    ],
  },
];

const intervalLabels: Record<string, string> = {
  month: '月',
  quarter: '季度',
  year: '年',
  lifetime: '终身',
};

const currencySymbols: Record<string, string> = {
  CNY: '¥',
  USD: '$',
};

const offerTypeLabels: Record<string, { label: string; color: string }> = {
  discount: { label: '折扣', color: 'orange' },
  coupon: { label: '优惠券', color: 'cyan' },
  bonus: { label: '赠品', color: 'purple' },
};

export default function PlansPage() {
  const [data] = useState(mockData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRecord | null>(null);
  const [form] = Form.useForm();
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const handleCreate = () => {
    form.validateFields().then((values) => {
      message.success('商品创建成功');
      setIsModalOpen(false);
      form.resetFields();
    });
  };

  const handleEdit = (record: PlanRecord) => {
    setEditingPlan(record);
    form.setFieldsValue({
      name: record.name,
      price: record.price,
      currency: record.currency,
      interval: record.interval,
      trialDays: record.trialDays,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (record: PlanRecord) => {
    Modal.confirm({
      title: '确认删除',
      icon: <DeleteOutlined />,
      content: (
        <div>
          <p>确定要删除商品「{record.name}」吗？</p>
          <Text type="secondary">此操作不可撤销，相关订阅数据也将受到影响。</Text>
        </div>
      ),
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        message.success(`商品「${record.name}」已删除`);
      },
    });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    form.resetFields();
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      message.success(`商品「${values.name}」已更新`);
      handleModalClose();
    });
  };

  const renderPrice = (record: PlanRecord) => {
    const symbol = currencySymbols[record.currency] || '¥';
    if (record.originalPrice && record.originalPrice > record.price) {
      return (
        <Space direction="vertical" size={0}>
          <Text>
            <Text delete type="secondary">{symbol}{record.originalPrice.toFixed(2)}</Text>
            <Text style={{ marginLeft: 8 }} strong color="#ff4d4f">
              {symbol}{record.price.toFixed(2)}
            </Text>
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.currency}
          </Text>
        </Space>
      );
    }
    return (
      <Space direction="vertical" size={0}>
        <Text strong>{symbol}{record.price.toFixed(2)}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.currency}
        </Text>
      </Space>
    );
  };

  const renderFeatures = (features: Feature[]) => {
    const unlockedCount = features.filter(f => f.unlocked).length;
    const content = (
      <div style={{ maxWidth: 280 }}>
        <Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
          已解锁 {unlockedCount}/{features.length} 项功能
        </Paragraph>
        <Space wrap size={4}>
          {features.map(feature => (
            <Tag
              key={feature.id}
              color={feature.unlocked ? 'green' : 'default'}
              style={{ marginBottom: 4 }}
            >
              {feature.unlocked ? '✓' : '✗'} {feature.name}
            </Tag>
          ))}
        </Space>
      </div>
    );
    return (
      <Popover content={content} title="功能解锁" trigger="hover" placement="top">
        <Tag color="blue" style={{ cursor: 'pointer' }}>
          {unlockedCount}/{features.length} 功能
        </Tag>
      </Popover>
    );
  };

  const renderOffers = (offers: Offer[]) => {
    if (!offers.length) return <Text type="secondary">-</Text>;
    return (
      <Space wrap size={4}>
        {offers.map(offer => (
          <Tag key={offer.id} color={offerTypeLabels[offer.type]?.color}>
            {offer.name}: {offer.value}
          </Tag>
        ))}
      </Space>
    );
  };

  const renderPaywalls = (paywalls: Paywall[]) => {
    if (!paywalls.length) return <Text type="secondary">-</Text>;
    const content = (
      <div>
        <Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
          关联 {paywalls.length} 个付费墙
        </Paragraph>
        <Space direction="vertical" size={4}>
          {paywalls.map(pw => (
            <Tag key={pw.id} style={{ cursor: 'pointer' }}>
              {pw.name}
            </Tag>
          ))}
        </Space>
      </div>
    );
    return (
      <Popover content={content} title="付费墙关联" trigger="hover" placement="top">
        <Tag color="purple" style={{ cursor: 'pointer' }}>
          {paywalls.length} 个付费墙
        </Tag>
      </Popover>
    );
  };

  const renderExpandedRowRender = (record: PlanRecord) => {
    return (
      <div style={{ padding: '16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <div>
            <Text strong type="secondary" style={{ display: 'block', marginBottom: 8 }}>优惠活动</Text>
            {renderOffers(record.offers)}
          </div>
          <div>
            <Text strong type="secondary" style={{ display: 'block', marginBottom: 8 }}>功能解锁</Text>
            {renderFeatures(record.features)}
          </div>
          <div>
            <Text strong type="secondary" style={{ display: 'block', marginBottom: 8 }}>付费墙关联</Text>
            {renderPaywalls(record.paywalls)}
          </div>
        </div>
      </div>
    );
  };

  const columns: ColumnsType<PlanRecord> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 120, responsive: ['md'] },
    { title: '名称', dataIndex: 'name', key: 'name', render: (name: string, record) => (
      <Space>
        <Text strong>{name}</Text>
        {record.originalPrice && record.originalPrice > record.price && (
          <Tag color="red">限时特惠</Tag>
        )}
      </Space>
    )},
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (_: number, record: PlanRecord) => renderPrice(record),
      width: 140,
    },
    {
      title: '周期',
      dataIndex: 'interval',
      key: 'interval',
      render: (interval: string) => intervalLabels[interval] || interval,
      width: 80,
    },
    {
      title: '试用',
      dataIndex: 'trialDays',
      key: 'trialDays',
      render: (d: number) => d ? `${d}天` : '-',
      width: 70,
      responsive: ['lg'],
    },
    {
      title: '订阅人数',
      dataIndex: 'subscribers',
      key: 'subscribers',
      render: (s: number) => s.toLocaleString(),
      width: 100,
      responsive: ['lg'],
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge status={status === 'active' ? 'success' : 'default'} text={status === 'active' ? '启用' : '停用'} />
      ),
      width: 90,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: PlanRecord) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
      width: 160,
      fixed: 'right',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">商品管理</h1>
          <Text type="secondary">管理订阅计划、定价和功能解锁</Text>
        </div>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>创建商品</Button>
      </div>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 个商品` }}
        expandable={{
          expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys(keys),
          expandedRowRender: renderExpandedRowRender,
          expandIcon: ({ expanded, onExpand, record }) => (
            <Button
              type="text"
              size="small"
              icon={expanded ? <DownOutlined /> : <RightOutlined />}
              onClick={(e) => onExpand(record, e)}
              style={{ marginRight: 8 }}
            >
              {expanded ? '收起' : '详情'}
            </Button>
          ),
        }}
        scroll={{ x: 900 }}
      />
      <Modal
        title={editingPlan ? '编辑商品' : '创建商品'}
        open={isModalOpen}
        onOk={editingPlan ? handleSave : handleCreate}
        onCancel={handleModalClose}
        okText={editingPlan ? '保存' : '创建'}
        cancelText="取消"
        width={520}
      >
        <Form form={form} layout="vertical" className="pt-4">
          <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}>
            <Input placeholder="如：月度专业版" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="price" label="价格" rules={[{ required: true, message: '请输入价格' }]} style={{ flex: 1 }}>
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
            <Form.Item name="currency" label="货币" initialValue="CNY" rules={[{ required: true }]} style={{ width: 120 }}>
              <Select>
                <Select.Option value="CNY">CNY (¥)</Select.Option>
                <Select.Option value="USD">USD ($)</Select.Option>
              </Select>
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="interval" label="计费周期" rules={[{ required: true, message: '请选择计费周期' }]} style={{ flex: 1 }}>
              <Select placeholder="选择计费周期">
                <Select.Option value="month">月</Select.Option>
                <Select.Option value="quarter">季度</Select.Option>
                <Select.Option value="year">年</Select.Option>
                <Select.Option value="lifetime">终身</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="trialDays" label="试用天数" style={{ width: 140 }}>
              <InputNumber min={0} max={365} style={{ width: '100%' }} placeholder="0 表示无试用" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}