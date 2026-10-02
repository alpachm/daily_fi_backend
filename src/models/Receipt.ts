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
  declare file_url: string;
  declare type: ReceiptType;
  declare date: string;
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
    file_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(ReceiptType.PURCHASE, ReceiptType.SALE),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'receipts',
    timestamps: false,
  },
);
