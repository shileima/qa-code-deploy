// @ts-nocheck
const { STRING, INTEGER, DATE, NOW } = global.rds.Sequelize
const UserModel = global.rds.define('test_user', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: STRING,
    status: STRING,
    created_time: {
      type: DATE,
      defaultValue: NOW
    },
    updated_time: {
      type: DATE,
      defaultValue: NOW
    }
  },
  {
    timestamps:false, // 针对报错Unknown column 'createdAt' in 'field list'
    tableName:'test_user' // 针对报错里表名里多了个s
  }) 
  export default UserModel;