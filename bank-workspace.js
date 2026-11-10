// Harder multi-class problems. The prompt names every class, field, and method
// the grader calls. Starters are empty shells; the hidden Grader is not shown.

function shell(name) {
  return `public class ${name} {\n\n}\n`;
}

function appShell(name) {
  return `public class ${name} {\n    public static void main(String[] args) {\n\n    }\n}\n`;
}

export const WORKSPACE_QUESTIONS = [
  {
    id: "mc-student",
    topic: "Instantiable Classes",
    type: "workspace",
    title: "Student and StudentTest",
    prompt: `Write two classes.

Student (file Student.java) has private fields name (String), mark1 (double), mark2 (double), and average (double). Add setName, setMark1, setMark2, computeAverage, getAverage, and toString.
computeAverage sets average to (mark1 + mark2) / 2.
toString returns the name, then ": ", then the average.

StudentTest (file StudentTest.java) has main. Create a Student, call setName with "Sam", setMark1 with 70, setMark2 with 80, call computeAverage, and print getAverage.

The grader builds its own driver around Student, so those method names must match.`,
    explanation: "Student stores the inputs, computeAverage writes average, and getAverage returns it. StudentTest is the driver: construct, set, compute, get.",
    hint: "Keep the fields private. In each setter, the parameter can share the field's name if you assign with this. computeAverage does not print; it only stores average.",
    api: ["Student", "StudentTest", "name", "mark1", "mark2", "average", "setName", "setMark1", "setMark2", "computeAverage", "getAverage", "toString"],
    files: [
      { name: "Student.java", content: shell("Student") },
      { name: "StudentTest.java", content: appShell("StudentTest") },
    ],
    checks: [
      { file: "Student.java", pattern: "private\\s+String\\s+name\\s*;", message: "Student needs private String name." },
      { file: "Student.java", pattern: "private\\s+double\\s+mark1\\s*;", message: "Student needs private double mark1." },
      { file: "Student.java", pattern: "private\\s+double\\s+mark2\\s*;", message: "Student needs private double mark2." },
      { file: "Student.java", pattern: "private\\s+double\\s+average\\s*;", message: "Student needs private double average." },
      { file: "Student.java", pattern: "void\\s+computeAverage\\s*\\(", message: "Add computeAverage." },
      { file: "Student.java", pattern: "getAverage\\s*\\(", message: "Add getAverage." },
      { file: "StudentTest.java", pattern: "new\\s+Student\\s*\\(", message: "StudentTest should construct a Student." },
      { file: "StudentTest.java", pattern: "setName\\s*\\(\\s*\"Sam\"\\s*\\)", message: "StudentTest should call setName(\"Sam\")." },
      { file: "StudentTest.java", pattern: "setMark1\\s*\\(\\s*70\\s*\\)", message: "StudentTest should call setMark1(70)." },
      { file: "StudentTest.java", pattern: "setMark2\\s*\\(\\s*80\\s*\\)", message: "StudentTest should call setMark2(80)." },
      { file: "StudentTest.java", pattern: "computeAverage\\s*\\(", message: "StudentTest should call computeAverage." },
    ],
    gradeFiles: ["Student.java"],
    hiddenFiles: [{
      name: "Grader.java",
      content: `public class Grader {
    public static void main(String[] args) {
        Student s = new Student();
        s.setName("Sam");
        s.setMark1(70);
        s.setMark2(80);
        s.computeAverage();
        System.out.println("avg=" + s.getAverage());
        System.out.println(s.toString());
    }
}
`,
    }],
    expectLines: ["avg=75.0", "Sam: 75.0"],
  },
  {
    id: "mc-box",
    topic: "Instantiable Classes",
    type: "workspace",
    title: "Box and BoxTest",
    prompt: `Write two classes.

Box (file Box.java) has private int fields length, width, height, and volume.
Add setLength, setWidth, and setHeight. Each parameter uses the same name as its field, and the body assigns the field with this.
computeVolume sets volume to length * width * height.
getVolume returns volume.
toString returns "volume=" followed by volume.

BoxTest (file BoxTest.java) has main. Create a Box, call setLength(2), setWidth(3), setHeight(4), computeVolume, and print getVolume.

The grader also builds a second Box with length 5, width 1, and height 1.`,
    explanation: "The setters copy inputs onto the object with this. computeVolume is the only place the product is calculated. getVolume just returns the stored field.",
    hint: "volume should stay 0 until computeVolume runs. If getVolume prints the product itself, the second object in the grader will not match.",
    api: ["Box", "BoxTest", "length", "width", "height", "volume", "setLength", "setWidth", "setHeight", "computeVolume", "getVolume", "toString"],
    files: [
      { name: "Box.java", content: shell("Box") },
      { name: "BoxTest.java", content: appShell("BoxTest") },
    ],
    checks: [
      { file: "Box.java", pattern: "private\\s+int\\s+[^;]*\\blength\\b", message: "Declare private int length." },
      { file: "Box.java", pattern: "private\\s+int\\s+[^;]*\\bwidth\\b", message: "Declare private int width." },
      { file: "Box.java", pattern: "private\\s+int\\s+[^;]*\\bheight\\b", message: "Declare private int height." },
      { file: "Box.java", pattern: "private\\s+int\\s+[^;]*\\bvolume\\b", message: "Declare private int volume." },
      { file: "Box.java", pattern: "void\\s+computeVolume\\s*\\(", message: "Add computeVolume." },
      { file: "Box.java", pattern: "this\\.length\\s*=\\s*length", message: "setLength should assign this.length = length." },
      { file: "BoxTest.java", pattern: "new\\s+Box\\s*\\(", message: "BoxTest should construct a Box." },
      { file: "BoxTest.java", pattern: "setLength\\s*\\(\\s*2\\s*\\)", message: "BoxTest should call setLength(2)." },
      { file: "BoxTest.java", pattern: "computeVolume\\s*\\(", message: "BoxTest should call computeVolume." },
    ],
    gradeFiles: ["Box.java"],
    hiddenFiles: [{
      name: "Grader.java",
      content: `public class Grader {
    public static void main(String[] args) {
        Box first = new Box();
        first.setLength(2);
        first.setWidth(3);
        first.setHeight(4);
        first.computeVolume();
        System.out.println("vol=" + first.getVolume());
        System.out.println(first.toString());
        Box second = new Box();
        second.setLength(5);
        second.setWidth(1);
        second.setHeight(1);
        second.computeVolume();
        System.out.println("vol=" + second.getVolume());
    }
}
`,
    }],
    expectLines: ["vol=24", "volume=24", "vol=5"],
  },
  {
    id: "mc-account",
    topic: "Instantiable Classes",
    type: "workspace",
    title: "BankAccount and BankApp",
    prompt: `Write two classes.

BankAccount (file BankAccount.java) has private String owner and private double balance.
Add setOwner.
deposit takes a double amount and adds it to balance only when amount is greater than 0.
withdraw takes a double amount. If amount is greater than 0 and amount is less than or equal to balance, subtract it and return true. Otherwise leave balance unchanged and return false.
getBalance returns balance.

BankApp (file BankApp.java) has main. Create a BankAccount, call setOwner with "Ada", deposit 100, withdraw 40, and print getBalance.

The grader checks a failed withdraw of 1000 as well, and a deposit of -5, which must not change the balance.`,
    explanation: "deposit and withdraw are the methods that change balance, and both refuse a bad amount. getBalance only reports the field. Returning false from withdraw tells the caller the money stayed put.",
    hint: "Test the amount before you change balance. A failing withdraw must return false without subtracting.",
    api: ["BankAccount", "BankApp", "owner", "balance", "setOwner", "deposit", "withdraw", "getBalance"],
    files: [
      { name: "BankAccount.java", content: shell("BankAccount") },
      { name: "BankApp.java", content: appShell("BankApp") },
    ],
    checks: [
      { file: "BankAccount.java", pattern: "private\\s+String\\s+owner\\s*;", message: "Declare private String owner." },
      { file: "BankAccount.java", pattern: "private\\s+double\\s+balance\\s*;", message: "Declare private double balance." },
      { file: "BankAccount.java", pattern: "void\\s+deposit\\s*\\(", message: "Add deposit." },
      { file: "BankAccount.java", pattern: "boolean\\s+withdraw\\s*\\(", message: "withdraw should return boolean." },
      { file: "BankAccount.java", pattern: "getBalance\\s*\\(", message: "Add getBalance." },
      { file: "BankApp.java", pattern: "new\\s+BankAccount\\s*\\(", message: "BankApp should construct a BankAccount." },
      { file: "BankApp.java", pattern: "deposit\\s*\\(", message: "BankApp should call deposit." },
      { file: "BankApp.java", pattern: "withdraw\\s*\\(", message: "BankApp should call withdraw." },
    ],
    gradeFiles: ["BankAccount.java"],
    hiddenFiles: [{
      name: "Grader.java",
      content: `public class Grader {
    public static void main(String[] args) {
        BankAccount account = new BankAccount();
        account.setOwner("Ada");
        account.deposit(100);
        boolean taken = account.withdraw(40);
        System.out.println("taken=" + taken);
        System.out.println("bal=" + account.getBalance());
        account.deposit(-5);
        boolean refused = account.withdraw(1000);
        System.out.println("refused=" + refused);
        System.out.println("bal=" + account.getBalance());
    }
}
`,
    }],
    expectLines: ["taken=true", "bal=60.0", "refused=false", "bal=60.0"],
  },
  {
    id: "mc-book",
    topic: "Instantiable Classes",
    type: "workspace",
    title: "Book and BookApp",
    prompt: `Write two classes.

Book (file Book.java) has private String title, private double price, private int copies, and private double value.
Add setTitle, setPrice, and setCopies.
computeValue sets value to price * copies.
getValue returns value.
toString returns the title, a space, and the value.

BookApp (file BookApp.java) has main. Create a Book, call setTitle with "Hamlet", setPrice with 12.5, setCopies with 4, call computeValue, and print getValue.

The grader prints both getValue and toString.`,
    explanation: "This is the set, compute, get pattern with a stock value. toString is for display; getValue is the number the rest of the program can keep using.",
    hint: "price times copies is a double because price is a double. Compute it inside computeValue, not inside getValue.",
    api: ["Book", "BookApp", "title", "price", "copies", "value", "setTitle", "setPrice", "setCopies", "computeValue", "getValue", "toString"],
    files: [
      { name: "Book.java", content: shell("Book") },
      { name: "BookApp.java", content: appShell("BookApp") },
    ],
    checks: [
      { file: "Book.java", pattern: "private\\s+String\\s+title\\s*;", message: "Declare private String title." },
      { file: "Book.java", pattern: "private\\s+double\\s+price\\s*;", message: "Declare private double price." },
      { file: "Book.java", pattern: "private\\s+int\\s+copies\\s*;", message: "Declare private int copies." },
      { file: "Book.java", pattern: "private\\s+double\\s+value\\s*;", message: "Declare private double value." },
      { file: "Book.java", pattern: "void\\s+computeValue\\s*\\(", message: "Add computeValue." },
      { file: "BookApp.java", pattern: "setTitle\\s*\\(\\s*\"Hamlet\"\\s*\\)", message: "BookApp should call setTitle(\"Hamlet\")." },
      { file: "BookApp.java", pattern: "computeValue\\s*\\(", message: "BookApp should call computeValue." },
    ],
    gradeFiles: ["Book.java"],
    hiddenFiles: [{
      name: "Grader.java",
      content: `public class Grader {
    public static void main(String[] args) {
        Book book = new Book();
        book.setTitle("Hamlet");
        book.setPrice(12.5);
        book.setCopies(4);
        book.computeValue();
        System.out.println("val=" + book.getValue());
        System.out.println(book.toString());
    }
}
`,
    }],
    expectLines: ["val=50.0", "Hamlet 50.0"],
  },
  {
    id: "mc-module",
    topic: "Instantiable Classes",
    type: "workspace",
    title: "ModuleResult and ModuleApp",
    prompt: `Write two classes. This one mixes an instantiable class with selection.

ModuleResult (file ModuleResult.java) has private String name, private int mark, and private String grade.
Add setName and setMark.
computeGrade sets grade from mark, in this order:
- if mark is below 0 or mark is above 100, grade is "Invalid"
- otherwise if mark is at least 70, grade is "Distinction"
- otherwise if mark is at least 55, grade is "Merit"
- otherwise if mark is at least 40, grade is "Pass"
- otherwise grade is "Fail"
getGrade returns grade.
toString returns the name, a space, and the grade.

ModuleApp (file ModuleApp.java) has main. Create a ModuleResult, call setName with "Row", setMark with 70, computeGrade, and print getGrade.

The grader also tries the marks 55, 40, 39, -1, and 101.`,
    explanation: "computeGrade is a compute method whose body is a selection ladder. Invalid has to be tested before the pass bands, or a mark of 101 would look like a Distinction.",
    hint: "Use if / else if, and put the Invalid test first. Store the word in grade. Do not return it from computeGrade.",
    api: ["ModuleResult", "ModuleApp", "name", "mark", "grade", "setName", "setMark", "computeGrade", "getGrade", "toString", "Invalid", "Distinction", "Merit", "Pass", "Fail"],
    files: [
      { name: "ModuleResult.java", content: shell("ModuleResult") },
      { name: "ModuleApp.java", content: appShell("ModuleApp") },
    ],
    checks: [
      { file: "ModuleResult.java", pattern: "private\\s+String\\s+name\\s*;", message: "Declare private String name." },
      { file: "ModuleResult.java", pattern: "private\\s+int\\s+mark\\s*;", message: "Declare private int mark." },
      { file: "ModuleResult.java", pattern: "private\\s+String\\s+grade\\s*;", message: "Declare private String grade." },
      { file: "ModuleResult.java", pattern: "void\\s+computeGrade\\s*\\(", message: "Add computeGrade." },
      { file: "ModuleResult.java", pattern: "Invalid", message: "computeGrade should be able to store Invalid." },
      { file: "ModuleResult.java", pattern: "Distinction", message: "computeGrade should be able to store Distinction." },
      { file: "ModuleApp.java", pattern: "setMark\\s*\\(\\s*70\\s*\\)", message: "ModuleApp should call setMark(70)." },
      { file: "ModuleApp.java", pattern: "computeGrade\\s*\\(", message: "ModuleApp should call computeGrade." },
    ],
    gradeFiles: ["ModuleResult.java"],
    hiddenFiles: [{
      name: "Grader.java",
      content: `public class Grader {
    public static void main(String[] args) {
        ModuleResult a = new ModuleResult();
        a.setName("Row");
        a.setMark(70);
        a.computeGrade();
        System.out.println(a.getGrade());
        ModuleResult b = new ModuleResult();
        b.setName("Row");
        b.setMark(55);
        b.computeGrade();
        System.out.println(b.getGrade());
        ModuleResult c = new ModuleResult();
        c.setName("Row");
        c.setMark(40);
        c.computeGrade();
        System.out.println(c.getGrade());
        ModuleResult d = new ModuleResult();
        d.setName("Row");
        d.setMark(39);
        d.computeGrade();
        System.out.println(d.getGrade());
        ModuleResult e = new ModuleResult();
        e.setName("Row");
        e.setMark(-1);
        e.computeGrade();
        System.out.println(e.getGrade());
        ModuleResult f = new ModuleResult();
        f.setName("Row");
        f.setMark(101);
        f.computeGrade();
        System.out.println(f.getGrade());
        System.out.println(a.toString());
    }
}
`,
    }],
    expectLines: ["Distinction", "Merit", "Pass", "Fail", "Invalid", "Invalid", "Row Distinction"],
  },
];
