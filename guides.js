// Guided builds, short to long. Each step has instructions, a hint, and rules.
// Later steps keep the earlier rules, so a passing program still has the earlier pieces.

const MAIN = "public\\s+static\\s+void\\s+main\\s*\\(\\s*String\\s*(?:\\[\\s*\\]\\s*args|args\\s*\\[\\s*\\])\\s*\\)";

export const GUIDES = [
  {
    id: "hello",
    title: "Say hello",
    level: "1 · Basics & Scanner",
    summary: "A main method, a Scanner, and one line back to the user.",
    starters: [{
      name: "HelloApp.java",
      content: "public class HelloApp {\n\n}\n",
    }],
    steps: [
      {
        title: "Open main",
        file: "HelloApp.java",
        instructions: "Inside HelloApp, write the standard main method: public static void main(String[] args), with an empty body for now.",
        hint: "The header is public static void main(String[] args). String args[] is also accepted. The braces belong to the method, inside the class.",
        rules: [{ file: "HelloApp.java", pattern: MAIN, message: "Add public static void main(String[] args) inside HelloApp." }],
      },
      {
        title: "Attach a Scanner",
        file: "HelloApp.java",
        instructions: "Import java.util.Scanner. Inside main, create a Scanner that reads System.in. You can call the variable sc.",
        hint: "The import sits above the class. The object is created with new Scanner(System.in).",
        rules: [
          { file: "HelloApp.java", pattern: "import\\s+java\\.util\\.Scanner\\s*;", message: "Import java.util.Scanner above the class." },
          { file: "HelloApp.java", pattern: "new\\s+Scanner\\s*\\(\\s*System\\.in\\s*\\)", message: "Create the Scanner with new Scanner(System.in)." },
        ],
      },
      {
        title: "Read a name",
        file: "HelloApp.java",
        instructions: "Read a whole line into a String named name. Use nextLine, not next, so a first and last name both fit.",
        hint: "String name = sc.nextLine(); if your Scanner is called sc. nextLine keeps the spaces.",
        rules: [{ file: "HelloApp.java", pattern: "String\\s+name\\s*=\\s*\\w+\\.nextLine\\s*\\(", message: "Read the line into a String named name with nextLine." }],
      },
      {
        title: "Answer the user",
        file: "HelloApp.java",
        instructions: "Print exactly Hello, followed by a comma, a space, and the name. If the user types Sam, the line is Hello, Sam. Then close the Scanner.",
        hint: "System.out.println(\"Hello, \" + name); then sc.close();",
        rules: [
          { file: "HelloApp.java", pattern: "System\\.out\\.println\\s*\\(", message: "Print with System.out.println." },
          { file: "HelloApp.java", pattern: "Hello,\\s*", message: "The printed text should start with Hello, including the comma." },
          { file: "HelloApp.java", pattern: "\\.close\\s*\\(", message: "Close the Scanner when you are done." },
        ],
        run: { cases: [{ stdin: "Sam\n", includes: ["Hello, Sam"] }] },
      },
    ],
  },
  {
    id: "marks",
    title: "Validate a mark",
    level: "2 · Selection",
    summary: "Reject marks outside 0 to 100, then Pass or Fail at 40.",
    starters: [{
      name: "MarkCheck.java",
      content: `import java.util.Scanner;

public class MarkCheck {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        sc.close();
    }
}
`,
    }],
    steps: [
      {
        title: "Read the mark",
        file: "MarkCheck.java",
        instructions: "The Scanner is already there. Read an int into a variable named mark with nextInt.",
        hint: "int mark = sc.nextInt(); sits above sc.close().",
        rules: [{ file: "MarkCheck.java", pattern: "int\\s+mark\\s*=\\s*\\w+\\.nextInt\\s*\\(", message: "Read an int into mark with nextInt." }],
      },
      {
        title: "Reject the impossible",
        file: "MarkCheck.java",
        instructions: "If mark is below 0 or above 100, print Invalid. Use || between the two tests. Do not print Pass or Fail in that branch.",
        hint: "if (mark < 0 || mark > 100) { System.out.println(\"Invalid\"); }",
        rules: [
          { file: "MarkCheck.java", pattern: "mark\\s*<\\s*0\\s*\\|\\|\\s*mark\\s*>\\s*100", message: "Test mark < 0 || mark > 100." },
          { file: "MarkCheck.java", pattern: "Invalid", message: "Print Invalid for a mark outside 0 to 100." },
        ],
      },
      {
        title: "Pass or fail",
        file: "MarkCheck.java",
        instructions: "Otherwise, if mark is at least 40 print Pass, and if it is lower print Fail. A mark of 40 is a Pass. Leave the Invalid branch first so 150 does not also print a grade.",
        hint: "else if (mark >= 40) prints Pass, and the final else prints Fail.",
        rules: [
          { file: "MarkCheck.java", pattern: "mark\\s*>=\\s*40", message: "Compare mark with 40." },
          { file: "MarkCheck.java", pattern: "Pass", message: "Print Pass for a mark of 40 or more." },
          { file: "MarkCheck.java", pattern: "Fail", message: "Print Fail for a mark below 40." },
        ],
        run: {
          cases: [
            { stdin: "85\n", includes: ["Pass"] },
            { stdin: "40\n", includes: ["Pass"] },
            { stdin: "39\n", includes: ["Fail"] },
            { stdin: "150\n", includes: ["Invalid"] },
            { stdin: "-3\n", includes: ["Invalid"] },
          ],
        },
      },
    ],
  },
  {
    id: "sum",
    title: "Sum from 1 to n",
    level: "3 · Loops",
    summary: "Read n and add the integers from 1 through n.",
    starters: [{
      name: "SumApp.java",
      content: `import java.util.Scanner;

public class SumApp {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        sc.close();
    }
}
`,
    }],
    steps: [
      {
        title: "Write the loop",
        file: "SumApp.java",
        instructions: "n is already read. Write a for loop whose counter i starts at 1 and keeps going while i is less than or equal to n, stepping by 1.",
        hint: "for (int i = 1; i <= n; i++) { }",
        rules: [{ file: "SumApp.java", pattern: "for\\s*\\(\\s*int\\s+i\\s*=\\s*1\\s*;\\s*i\\s*<=\\s*n\\s*;\\s*i\\+\\+\\s*\\)", message: "Use for (int i = 1; i <= n; i++)." }],
      },
      {
        title: "Keep a total",
        file: "SumApp.java",
        instructions: "Before the loop, set an int named sum to 0. Inside the loop, add i into sum.",
        hint: "int sum = 0; then sum = sum + i; or sum += i;",
        rules: [
          { file: "SumApp.java", pattern: "int\\s+sum\\s*=\\s*0\\s*;", message: "Start an int sum at 0 before the loop." },
          { file: "SumApp.java", pattern: "sum\\s*(\\+=\\s*i|=\\s*sum\\s*\\+\\s*i)", message: "Add i into sum inside the loop." },
        ],
      },
      {
        title: "Print the total",
        file: "SumApp.java",
        instructions: "After the loop, print sum and nothing else. For input 5 the only line of output is 15. For input 1 it is 1.",
        hint: "System.out.println(sum); sits after the loop and before sc.close().",
        rules: [{ file: "SumApp.java", pattern: "System\\.out\\.println\\s*\\(\\s*sum\\s*\\)", message: "Print sum with System.out.println(sum)." }],
        run: {
          cases: [
            { stdin: "5\n", includes: ["15"] },
            { stdin: "1\n", includes: ["1"] },
            { stdin: "10\n", includes: ["55"] },
          ],
        },
      },
    ],
  },
  {
    id: "box",
    title: "A Box you can construct",
    level: "4 · Instantiable class",
    summary: "Private fields, a constructor with this, setters, compute, toString, then a driver.",
    starters: [
      { name: "Box.java", content: "public class Box {\n\n}\n" },
      { name: "BoxTest.java", content: "public class BoxTest {\n    public static void main(String[] args) {\n\n    }\n}\n" },
    ],
    steps: [
      {
        title: "Data members",
        file: "Box.java",
        instructions: "In Box, declare four private int fields: length, width, height, and volume. Nothing else needs to change yet.",
        hint: "private int length; and the same shape for width, height, and volume. One line with commas is also fine.",
        rules: [
          { file: "Box.java", pattern: "private\\s+int\\s+[^;]*\\blength\\b", message: "Declare private int length." },
          { file: "Box.java", pattern: "private\\s+int\\s+[^;]*\\bwidth\\b", message: "Declare private int width." },
          { file: "Box.java", pattern: "private\\s+int\\s+[^;]*\\bheight\\b", message: "Declare private int height." },
          { file: "Box.java", pattern: "private\\s+int\\s+[^;]*\\bvolume\\b", message: "Declare private int volume." },
        ],
      },
      {
        title: "No-arg constructor",
        file: "Box.java",
        instructions: "Add public Box() and set every field to 0 through this. A brand-new box should not contain leftover values.",
        hint: "this.length = 0; and the same for width, height, and volume, inside public Box().",
        rules: [
          { file: "Box.java", pattern: "public\\s+Box\\s*\\(\\s*\\)", message: "Add the no-arg constructor public Box()." },
          { file: "Box.java", pattern: "this\\.length\\s*=\\s*0", message: "Set this.length to 0." },
          { file: "Box.java", pattern: "this\\.width\\s*=\\s*0", message: "Set this.width to 0." },
          { file: "Box.java", pattern: "this\\.height\\s*=\\s*0", message: "Set this.height to 0." },
          { file: "Box.java", pattern: "this\\.volume\\s*=\\s*0", message: "Set this.volume to 0." },
        ],
      },
      {
        title: "Setters that need this",
        file: "Box.java",
        instructions: "Add setLength, setWidth, and setHeight. Each takes an int parameter with the same name as the field. Assign the field with this so the parameter does not hide it.",
        hint: "public void setLength(int length) { this.length = length; } then the same shape for width and height.",
        rules: [
          { file: "Box.java", pattern: "void\\s+setLength\\s*\\(\\s*int\\s+length\\s*\\)", message: "Add setLength(int length)." },
          { file: "Box.java", pattern: "this\\.length\\s*=\\s*length", message: "setLength should do this.length = length." },
          { file: "Box.java", pattern: "void\\s+setWidth\\s*\\(\\s*int\\s+width\\s*\\)", message: "Add setWidth(int width)." },
          { file: "Box.java", pattern: "this\\.width\\s*=\\s*width", message: "setWidth should do this.width = width." },
          { file: "Box.java", pattern: "void\\s+setHeight\\s*\\(\\s*int\\s+height\\s*\\)", message: "Add setHeight(int height)." },
          { file: "Box.java", pattern: "this\\.height\\s*=\\s*height", message: "setHeight should do this.height = height." },
        ],
      },
      {
        title: "Compute the volume",
        file: "Box.java",
        instructions: "Add computeVolume with no parameters and no return value. It stores length times width times height in volume. Do not print inside it.",
        hint: "public void computeVolume() { volume = length * width * height; }",
        rules: [
          { file: "Box.java", pattern: "void\\s+computeVolume\\s*\\(\\s*\\)", message: "Add public void computeVolume()." },
          { file: "Box.java", pattern: "volume\\s*=\\s*(this\\.)?length\\s*\\*\\s*(this\\.)?width\\s*\\*\\s*(this\\.)?height", message: "Set volume to length * width * height." },
        ],
      },
      {
        title: "getVolume and toString",
        file: "Box.java",
        instructions: "Add getVolume, which returns volume. Add toString, which returns the text volume= immediately followed by the number, for example volume=24.",
        hint: "public int getVolume() { return volume; } and public String toString() { return \"volume=\" + volume; }",
        rules: [
          { file: "Box.java", pattern: "int\\s+getVolume\\s*\\(\\s*\\)", message: "Add getVolume returning an int." },
          { file: "Box.java", pattern: "return\\s+volume\\s*;", message: "getVolume should return volume." },
          { file: "Box.java", pattern: "String\\s+toString\\s*\\(\\s*\\)", message: "Add toString." },
          { file: "Box.java", pattern: "return\\s+\"volume=\"\\s*\\+\\s*volume\\s*;", message: "toString should return \"volume=\" + volume." },
        ],
      },
      {
        title: "Drive it from BoxTest",
        file: "BoxTest.java",
        instructions: "In BoxTest.main, create a Box. Call setLength(2), setWidth(3), and setHeight(4). Call computeVolume. Print getVolume on one line and toString on the next. You want 24, then volume=24.",
        hint: "Box box = new Box(); then the three setters, computeVolume(), println of getVolume(), println of toString().",
        rules: [
          { file: "BoxTest.java", pattern: "new\\s+Box\\s*\\(", message: "Construct a Box with new Box()." },
          { file: "BoxTest.java", pattern: "setLength\\s*\\(\\s*2\\s*\\)", message: "Call setLength(2)." },
          { file: "BoxTest.java", pattern: "setWidth\\s*\\(\\s*3\\s*\\)", message: "Call setWidth(3)." },
          { file: "BoxTest.java", pattern: "setHeight\\s*\\(\\s*4\\s*\\)", message: "Call setHeight(4)." },
          { file: "BoxTest.java", pattern: "computeVolume\\s*\\(", message: "Call computeVolume." },
          { file: "BoxTest.java", pattern: "getVolume\\s*\\(", message: "Print the result of getVolume." },
        ],
        run: { cases: [{ stdin: "", includes: ["24", "volume=24"] }] },
      },
    ],
  },
  {
    id: "students",
    title: "Two students, one grade each",
    level: "5 · Class, selection, driver",
    summary: "A Student that computes an average and a grade, and an app that builds two of them.",
    starters: [
      { name: "Student.java", content: "public class Student {\n\n}\n" },
      { name: "CourseApp.java", content: "public class CourseApp {\n    public static void main(String[] args) {\n\n    }\n}\n" },
    ],
    steps: [
      {
        title: "Fields",
        file: "Student.java",
        instructions: "Give Student five private fields: String name, double mark1, double mark2, double average, and String grade.",
        hint: "private String name; private double mark1; and so on. average and grade are results, but they are still private fields.",
        rules: [
          { file: "Student.java", pattern: "private\\s+String\\s+name\\s*;", message: "Declare private String name." },
          { file: "Student.java", pattern: "private\\s+double\\s+mark1\\s*;", message: "Declare private double mark1." },
          { file: "Student.java", pattern: "private\\s+double\\s+mark2\\s*;", message: "Declare private double mark2." },
          { file: "Student.java", pattern: "private\\s+double\\s+average\\s*;", message: "Declare private double average." },
          { file: "Student.java", pattern: "private\\s+String\\s+grade\\s*;", message: "Declare private String grade." },
        ],
      },
      {
        title: "Constructor",
        file: "Student.java",
        instructions: "Add public Student() and set the strings to an empty string and the numbers to 0, all through this.",
        hint: "this.name = \"\"; this.mark1 = 0; this.mark2 = 0; this.average = 0; this.grade = \"\";",
        rules: [
          { file: "Student.java", pattern: "public\\s+Student\\s*\\(\\s*\\)", message: "Add public Student()." },
          { file: "Student.java", pattern: "this\\.name\\s*=\\s*\"\"", message: "Set this.name to an empty string." },
          { file: "Student.java", pattern: "this\\.mark1\\s*=\\s*0", message: "Set this.mark1 to 0." },
          { file: "Student.java", pattern: "this\\.mark2\\s*=\\s*0", message: "Set this.mark2 to 0." },
          { file: "Student.java", pattern: "this\\.average\\s*=\\s*0", message: "Set this.average to 0." },
          { file: "Student.java", pattern: "this\\.grade\\s*=\\s*\"\"", message: "Set this.grade to an empty string." },
        ],
      },
      {
        title: "Setters",
        file: "Student.java",
        instructions: "Add setName(String name), setMark1(double mark1), and setMark2(double mark2). Assign each field with this.",
        hint: "this.name = name; and the same pattern for mark1 and mark2.",
        rules: [
          { file: "Student.java", pattern: "void\\s+setName\\s*\\(\\s*String\\s+name\\s*\\)", message: "Add setName(String name)." },
          { file: "Student.java", pattern: "this\\.name\\s*=\\s*name", message: "setName should assign this.name = name." },
          { file: "Student.java", pattern: "void\\s+setMark1\\s*\\(\\s*double\\s+mark1\\s*\\)", message: "Add setMark1(double mark1)." },
          { file: "Student.java", pattern: "this\\.mark1\\s*=\\s*mark1", message: "setMark1 should assign this.mark1 = mark1." },
          { file: "Student.java", pattern: "void\\s+setMark2\\s*\\(\\s*double\\s+mark2\\s*\\)", message: "Add setMark2(double mark2)." },
          { file: "Student.java", pattern: "this\\.mark2\\s*=\\s*mark2", message: "setMark2 should assign this.mark2 = mark2." },
        ],
      },
      {
        title: "Average and grade",
        file: "Student.java",
        instructions: "Add computeResult. Set average to (mark1 + mark2) / 2. Then set grade: Distinction when average is at least 70, Pass when it is at least 40, otherwise Fail. Do not print.",
        hint: "if (average >= 70) grade = \"Distinction\"; else if (average >= 40) grade = \"Pass\"; else grade = \"Fail\";",
        rules: [
          { file: "Student.java", pattern: "void\\s+computeResult\\s*\\(\\s*\\)", message: "Add computeResult()." },
          { file: "Student.java", pattern: "average\\s*=\\s*\\(\\s*(this\\.)?mark1\\s*\\+\\s*(this\\.)?mark2\\s*\\)\\s*/\\s*2", message: "Set average to (mark1 + mark2) / 2." },
          { file: "Student.java", pattern: "average\\s*>=\\s*70", message: "Test average >= 70 for Distinction." },
          { file: "Student.java", pattern: "Distinction", message: "Store the word Distinction." },
          { file: "Student.java", pattern: "average\\s*>=\\s*40", message: "Test average >= 40 for Pass." },
          { file: "Student.java", pattern: "Fail", message: "Store the word Fail for a lower average." },
        ],
      },
      {
        title: "toString",
        file: "Student.java",
        instructions: "Add toString. Return the name, a single space, and the grade, such as Alex Distinction.",
        hint: "public String toString() { return name + \" \" + grade; }",
        rules: [
          { file: "Student.java", pattern: "String\\s+toString\\s*\\(\\s*\\)", message: "Add toString." },
          { file: "Student.java", pattern: "return\\s+name\\s*\\+\\s*\" \"\\s*\\+\\s*grade\\s*;", message: "Return name + \" \" + grade." },
        ],
      },
      {
        title: "Two objects in CourseApp",
        file: "CourseApp.java",
        instructions: "In CourseApp.main, build two students and print each toString on its own line. Alex has marks 80 and 60, so the average is 70 and the grade is Distinction. Blake has marks 30 and 30, so the grade is Fail. Call setName, setMark1, setMark2, and computeResult on each object before printing.",
        hint: "Create two Student objects. Alex: setName(\"Alex\"), setMark1(80), setMark2(60), computeResult(). Blake: 30 and 30. Print both with println and toString().",
        rules: [
          { file: "CourseApp.java", pattern: "new\\s+Student\\s*\\(", message: "Construct a Student." },
          { file: "CourseApp.java", pattern: "setName\\s*\\(\\s*\"Alex\"\\s*\\)", message: "Call setName(\"Alex\")." },
          { file: "CourseApp.java", pattern: "setMark1\\s*\\(\\s*80\\s*\\)", message: "Give Alex setMark1(80)." },
          { file: "CourseApp.java", pattern: "setMark2\\s*\\(\\s*60\\s*\\)", message: "Give Alex setMark2(60)." },
          { file: "CourseApp.java", pattern: "setName\\s*\\(\\s*\"Blake\"\\s*\\)", message: "Call setName(\"Blake\")." },
          { file: "CourseApp.java", pattern: "setMark1\\s*\\(\\s*30\\s*\\)", message: "Give Blake setMark1(30)." },
          { file: "CourseApp.java", pattern: "setMark2\\s*\\(\\s*30\\s*\\)", message: "Give Blake setMark2(30)." },
          { file: "CourseApp.java", pattern: "computeResult\\s*\\(", message: "Call computeResult on the students." },
        ],
        run: { cases: [{ stdin: "", includes: ["Alex Distinction", "Blake Fail"] }] },
      },
    ],
  },
];
