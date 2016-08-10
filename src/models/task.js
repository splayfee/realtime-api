'use strict';

module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('task',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
        validate: {
          isInt: true
        }
      },
      description: {
        allowNull: false,
        type: DataTypes.STRING,
        validate: {
          len: [0, 255]
        }
      },
      completed: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        validate: {
          isBoolean: (value) => {
            if (typeof value !== 'boolean') {
              throw new Error('Only boolean values are allowed.');
            }
          }
        }
      }
    },
    {
      underscored: true,
      classMethods: {
        associate: (models) => {
        }
      }
    }
  );
  return Task;
};
