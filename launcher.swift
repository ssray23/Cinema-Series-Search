import Foundation
import Cocoa

let projectDir = "/Users/suddharay/Library/Mobile Documents/com~apple~CloudDocs/Mac Projects/Cinema Search"

func isPortActive() -> Bool {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/usr/bin/lsof")
    task.arguments = ["-i", ":8080"]
    let pipe = Pipe()
    task.standardOutput = pipe
    task.standardError = pipe
    do {
        try task.run()
        task.waitUntilExit()
        return task.terminationStatus == 0
    } catch {
        return false
    }
}

if !isPortActive() {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
    task.arguments = ["server.py"]
    task.currentDirectoryURL = URL(fileURLWithPath: projectDir)
    do {
        try task.run()
        Thread.sleep(forTimeInterval: 1.0)
    } catch {
        print("Failed to start server: \(error)")
    }
}

if let url = URL(string: "http://localhost:8080") {
    NSWorkspace.shared.open(url)
}
