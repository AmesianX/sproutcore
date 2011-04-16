files =  Dir["frameworks/core_foundation/**/*.js"] - Dir["frameworks/core_foundation/{protocols,tests}/**/*"]
files += Dir["frameworks/runtime/**/*.js"] - Dir["frameworks/runtime/{protocols,tests,debug}/**/*"]

def uglify(string)
  IO.popen("uglifyjs", "r+") do |io|
    io.puts string
    io.close_write
    return io.read
  end
end

def gzip(string)
  IO.popen("gzip -f", "r+") do |io|
    io.puts string
    io.close_write
    return io.read
  end
end


string = ""

files.each do |file|
  this_file = File.read(file)
  string += this_file
  size = this_file.size
  uglified = uglify(this_file)
  gzipped = gzip(uglified)

  puts "%8d %8d %8d - %s" % [size, uglified.size, gzipped.size, file]
end

uglified = uglify(string)
gzipped = gzip(uglified)

puts "%8d %8d %8d" % [string.size, uglified.size, gzipped.size]
