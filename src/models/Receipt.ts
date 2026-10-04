import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../database';
import { ReceiptType } from '../enums/receiptType';

export class Receipt extends Model<InferAttributes<Receipt>, InferCreationAttributes<Receipt>> {
  declare pk_receipts: CreationOptional<number>;
  declare fk_user: number;
  declare fk_daily_balance: number;
  declare file_key: string;
  declare type: ReceiptType;
  declare date: string;
  declare description: string | null;
  declare category: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Receipt.init(
  {
    pk_receipts: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fk_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fk_daily_balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    file_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(ReceiptType.PURCHASE, ReceiptType.SALE),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
  },
  {
    sequelize,
    tableName: 'receipts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);
