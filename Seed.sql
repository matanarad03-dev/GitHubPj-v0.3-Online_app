-- יוצר מסד נתונים חדש בשם library
CREATE DATABASE library;

-- יוצר משתמש חדש בשם libraryuser שמתחבר מהמחשב המקומי
CREATE USER 'libraryuser'@'localhost' IDENTIFIED BY 'pass1234';

-- נותן למשתמש הרשאות מלאות על כל הטבלאות במסד הנתונים library
GRANT ALL PRIVILEGES ON library.* TO 'libraryuser'@'localhost';

-- מרענן את ההרשאות כדי שהשינויים יחולו מיד
FLUSH PRIVILEGES;

-- סוגר את חיבור ה-SQL או ה-shell שבו פועל הפקודה
EXIT;