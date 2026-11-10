// Reference solutions used only by npm run check-questions. The app does not load this file.

export const GUIDE_SOLUTIONS = {
  hello: [{
    name: "HelloApp.java",
    content: `import java.util.Scanner;

public class HelloApp {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String name = sc.nextLine();
        System.out.println("Hello, " + name);
        sc.close();
    }
}
`,
  }],
  marks: [{
    name: "MarkCheck.java",
    content: `import java.util.Scanner;

public class MarkCheck {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int mark = sc.nextInt();
        if (mark < 0 || mark > 100) {
            System.out.println("Invalid");
        } else if (mark >= 40) {
            System.out.println("Pass");
        } else {
            System.out.println("Fail");
        }
        sc.close();
    }
}
`,
  }],
  sum: [{
    name: "SumApp.java",
    content: `import java.util.Scanner;

public class SumApp {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int sum = 0;
        for (int i = 1; i <= n; i++) {
            sum = sum + i;
        }
        System.out.println(sum);
        sc.close();
    }
}
`,
  }],
  box: [
    {
      name: "Box.java",
      content: `public class Box {
    private int length;
    private int width;
    private int height;
    private int volume;

    public Box() {
        this.length = 0;
        this.width = 0;
        this.height = 0;
        this.volume = 0;
    }

    public void setLength(int length) {
        this.length = length;
    }

    public void setWidth(int width) {
        this.width = width;
    }

    public void setHeight(int height) {
        this.height = height;
    }

    public void computeVolume() {
        volume = length * width * height;
    }

    public int getVolume() {
        return volume;
    }

    public String toString() {
        return "volume=" + volume;
    }
}
`,
    },
    {
      name: "BoxTest.java",
      content: `public class BoxTest {
    public static void main(String[] args) {
        Box box = new Box();
        box.setLength(2);
        box.setWidth(3);
        box.setHeight(4);
        box.computeVolume();
        System.out.println(box.getVolume());
        System.out.println(box.toString());
    }
}
`,
    },
  ],
  students: [
    {
      name: "Student.java",
      content: `public class Student {
    private String name;
    private double mark1;
    private double mark2;
    private double average;
    private String grade;

    public Student() {
        this.name = "";
        this.mark1 = 0;
        this.mark2 = 0;
        this.average = 0;
        this.grade = "";
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setMark1(double mark1) {
        this.mark1 = mark1;
    }

    public void setMark2(double mark2) {
        this.mark2 = mark2;
    }

    public void computeResult() {
        average = (mark1 + mark2) / 2;
        if (average >= 70) {
            grade = "Distinction";
        } else if (average >= 40) {
            grade = "Pass";
        } else {
            grade = "Fail";
        }
    }

    public String toString() {
        return name + " " + grade;
    }
}
`,
    },
    {
      name: "CourseApp.java",
      content: `public class CourseApp {
    public static void main(String[] args) {
        Student alex = new Student();
        alex.setName("Alex");
        alex.setMark1(80);
        alex.setMark2(60);
        alex.computeResult();
        System.out.println(alex.toString());

        Student blake = new Student();
        blake.setName("Blake");
        blake.setMark1(30);
        blake.setMark2(30);
        blake.computeResult();
        System.out.println(blake.toString());
    }
}
`,
  }],
};
