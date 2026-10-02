import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../database';

export class DailyBalance extends Model<
  InferAttributes<DailyBalance>,
  InferCreationAttributes<DailyBalance>
> {
  declare pk_daily_balance: CreationOptional<number>;
  declare fk_user: number;
  declare date: string;
  declare opening_balance: CreationOptional<number>;
  declare closing_balance: CreationOptional<number>;
  declare total_income: CreationOptional<number>;
  declare total_expenses: CreationOptional<number>;
  declare notes: string | null;
}

DailyBalance.init(
  {
    pk_daily_balance: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fk_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    opening_balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    closing_balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_income: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_expenses: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'daily_balances',
    timestamps: false,
  },
);
