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
        validate: {
          len: [0, 75]
        }
      },
      due_date: {
        allowNull: false,
        type: DataTypes.DATE,
        validate: {
          len: [0, 255]
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
